// third party
import { Curl, CurlPause, CurlCode, Easy, Multi, CurlInfoDebug, CurlReadFunc, CurlWriteFunc } from "node-libcurl";
import { Readable } from "stream";
import _trimEnd from "lodash/trimEnd";

// local
import { createFlatPromise, FlatPromise } from "../../shared/FlatPromise";
import { log } from "../log";

// really local
import { ClientOptions, ExecuteOptions, ExecuteResult, HttpHeaders } from "./PublicTypes";
import { RequestParts, RequestStreamState } from "./PrivateTypes";
import { parseResponseHeaders, bufToHeaderLines, headerMapToStrings } from "./Headers";

export class CurlClient {
  private handles: Easy[] = [];
  parts: RequestParts[] = [];

  private multi: Multi;

  public constructor(options?: ClientOptions) {
    this.multi = new Multi();
    this.multi.onMessage((err, handle, errCode) => this.onMessage(err, handle, errCode));
    if (options) {
      if (typeof options.maxConnections === "number") {
        this.multi.setOpt(Multi.option.MAX_TOTAL_CONNECTIONS, options.maxConnections);
      }
      if (typeof options.maxConnectionsPerHost === "number") {
        this.multi.setOpt(Multi.option.MAX_HOST_CONNECTIONS, options.maxConnectionsPerHost);
      }
    }
  }

  public execute(options: ExecuteOptions): Promise<ExecuteResult> {
    const [handle, parts] = this.createHandle(options);
    const { flatPromise } = parts;

    const maybeError = addOptionsThatMightReject(handle, options);
    if (maybeError instanceof Error) {
      this.safeCleanupHandle(handle);
      return Promise.reject(maybeError);
    }

    addRequestCommonOptions(handle, options);
    addResponseEntityHandler(handle, parts);
    addDebugHandler(handle, parts);
    setRequestMethod(handle, options);
    addRequestEntity(handle, options, flatPromise);
    addRequestHeaders(handle, options);

    // register and execute the libcurl Easy handle
    this.registerHandle(handle, parts);

    return flatPromise.promise;
  }

  private registerHandle(handle: Easy, parts: RequestParts) {
    if (parts.options.requestEntity instanceof Readable) {
      // if there is a Readable request entity, we need to wait until it's readable
      parts.options.requestEntity.once("readable", () => {
        // request entity is now readable, setup the handle
        parts.start = Date.now();
        this.multi.addHandle(handle);
      });
    } else {
      // add the handle immediately
      parts.start = Date.now();
      this.multi.addHandle(handle);
    }
  }

  private onMessage(err: Error | undefined, handle: Easy, errCode: CurlCode): void {

    // this is our best approximation for the point in time at which the request finished
    const now = Date.now();

    const parts = this.getHandleParts(handle);
    const { flatPromise, options } = parts;

    if (options.responseEntity) {
      options.responseEntity.end();
    }

    // node Error
    if (err) {
      this.safeCleanupHandle(handle);
      return flatPromise.reject(err);
    }

    // libcurl error code (not http status code!)
    if (errCode !== CurlCode.CURLE_OK) {
      this.safeCleanupHandle(handle);
      return flatPromise.reject(getErrorForCurlCode(errCode));
    }

    // we know since it's CurlCode.CURLE_OK that this will be a HTTP status code as a number
    const status = handle.getInfo(Curl.info.RESPONSE_CODE).data as number;

    // remove the Easy handle from the Multi instance
    this.multi.removeHandle(handle);
    // close the Easy handle
    handle.close();

    const [httpVersion, headers] = parseResponseHeaders(parts.receivedHeaders);

    this.safeCleanupHandle(handle);

    return flatPromise.resolve({
      status,
      headers,
      httpVersion,
      end: now,
      infos: parts.infos,
      start: parts.start || 0,
      entityBytesReceived: parts.entityBytesReceived,
      entityContentType: parts.entityContentType,
      entityEncoding: parts.entityEncoding,
    });
  }

  private getHandleParts(handle: Easy): RequestParts {
    const idx = this.handles.indexOf(handle);
    if (idx === -1) {
      throw new Error(`failed to find index for handle`);
    }
    return this.parts[idx];
  }

  private createHandle(options: ExecuteOptions): [Easy, RequestParts] {
    const flatPromise = createFlatPromise<ExecuteResult>();
    const handle = new Easy();
    this.handles.push(handle);
    const parts: RequestParts = {
      flatPromise,
      options,
      receivedHeaders: [],
      infos: [],
      entityBytesReceived: 0,
      entityEncoding: "identity",
    };
    this.parts.push(parts);
    return [handle, parts];
  }

  private safeCleanupHandle(handle: Easy): void {
    const idx = this.handles.indexOf(handle);
    if (idx !== -1) {
      this.handles.splice(idx, 1);
      this.parts.splice(idx, 1);
    }
  }

  public close() {
    this.multi.close();
  }
}

const addOptionsThatMightReject = (handle: Easy, options: ExecuteOptions): Error | null => {

  // need to handle buffer size out here since it might need to reject + return
  if (typeof options.receiveBufferSize === "number") {
    if (options.receiveBufferSize < 1024 || options.receiveBufferSize > 512 * 1024) {
      handle.close();
      return new Error(
        `libcurl option "CURLOPT_BUFFERSIZE" cannot be set to a value < 1024 or > ${512 *
        1024}, you requested ${options.receiveBufferSize}`
      );
    }
    handle.setOpt(Curl.option.BUFFERSIZE, options.receiveBufferSize);
  }
  if (typeof options.sendBufferSize === "number") {
    if (options.sendBufferSize < 16 * 1024 || options.sendBufferSize > 2 * 1024 * 1024) {
      handle.close();
      return new Error(
        `libcurl option "UPLOAD_BUFFERSIZE" cannot be set to a value < ${16 * 1024} or > ${2 *
        1024 *
        1024}, you requested ${options.sendBufferSize}`
      );
    }
    handle.setOpt(Curl.option.UPLOAD_BUFFERSIZE, options.sendBufferSize);
  }

  return null;
};

const addRequestCommonOptions = (handle: Easy, options: ExecuteOptions): void => {
  handle.setOpt(Curl.option.URL, options.url);
  handle.setOpt(Curl.option.NOPROGRESS, 1);
  handle.setOpt(Curl.option.HTTP_CONTENT_DECODING, 0);
  handle.setOpt(Curl.option.VERBOSE, 1);
};

const addResponseEntityHandler = (handle: Easy, parts: RequestParts): void => {

  const { options } = parts;

  if (options.responseEntity) {
    const responseStream = options.responseEntity;

    const writeState = { wantsPause: false };

    // when pausing/unpausing, curl calls this function with previous buffer when it resumes
    // so to integrate nicely with nodejs streams where you have to already write the data before finding out
    // if backpressure is triggered, we need to track some state and bail out if the stream wants us to pause
    handle.setOpt(Curl.option.WRITEFUNCTION, (data, size, nmemb) => {

      // the last stream write wanted backpressure, inform libcurl to back off
      if (writeState.wantsPause) {
        return CurlWriteFunc.Pause;
      }

      const readyForMore = responseStream.write(data);

      parts.entityBytesReceived += data.length;

      // stream wants backpressure
      if (!readyForMore) {
        // track some state so we can inform libcurl on the next go-around
        writeState.wantsPause = true;

        // wait for the next drain event so we can unpause libcurl
        responseStream.once("drain", () => {
          // once the stream has drained, track state such that we don't want to pause anymore
          writeState.wantsPause = false;
          // unpause libcurl receive stream
          handle.pause(CurlPause.RecvCont);
        });
      }

      // A-OK, continue as normal
      return data.length;
    });
  } else {

    if (options.method !== "OPTIONS" && options.method !== "HEAD") {
      // this might otherwise have a response entity but since we don't need to stream the result anywhere, screw it
      handle.setOpt(Curl.option.NOBODY, 1);
    }

  }

};

const CONTENT_TYPE_HEADER_REGEX = /content-type: *(.*)/i;
const CONTENT_ENCODING_HEADER_REGEX = /content-encoding: *(.*)/i;

const processHeaderForTracking = (header: string, parts: RequestParts): void => {
  parts.receivedHeaders.push(header);

  let matches = CONTENT_TYPE_HEADER_REGEX.exec(header);
  if (matches) {
    // this is the content type header, extract the content type
    parts.entityContentType = matches[1].trim();
    return; // optimistic quit
  }

  matches = CONTENT_ENCODING_HEADER_REGEX.exec(header);
  if (matches) {
    // this is the content type header, extract the content type
    parts.entityEncoding = matches[1].trim();
    return; // optimistic quit
  }
};

const LAST_HEADER = Buffer.from("\r\n");

const addDebugHandler = (handle: Easy, parts: RequestParts): void => {

  const { infos } = parts;

  handle.setOpt(Curl.option.DEBUGFUNCTION, (infoType, content) => {
    const now = Date.now();
    switch (infoType) {
      case CurlInfoDebug.Text:
        infos.push({ at: now, message: content.toString().trim() });
        break;
      case CurlInfoDebug.HeaderIn:
        if (content.length === 2 && LAST_HEADER.equals(content)) {
          // last header, do nothing
        } else {
          bufToHeaderLines(content).forEach(header => processHeaderForTracking(header, parts));
        }
        break;
    }

    // this must return 0, the TypeScript type sig is wrong (says void)
    // TODO: update to a newer libcurl once is https://github.com/JCMais/node-libcurl/pull/202 in a stable build
    // see https://curl.haxx.se/libcurl/c/CURLOPT_DEBUGFUNCTION.html
    return 0;
  });
};

const setRequestMethod = (handle: Easy, options: ExecuteOptions): void => {
  if (options.method === "POST") {
    handle.setOpt(Curl.option.POST, 1);
  } else if (options.method === "PUT") {
    handle.setOpt(Curl.option.PUT, 1);
  } else if (options.method === "GET") {
    handle.setOpt(Curl.option.HTTPGET, 1);
  } else {
    handle.setOpt(Curl.option.CUSTOMREQUEST, options.method);
  }
  if (options.requestEntity !== undefined && options.method !== "POST" && options.method !== "PUT") {
    handle.setOpt(Curl.option.UPLOAD, 1);
  }
};

const addRequestEntity = (handle: Easy, options: ExecuteOptions, flatPromise: FlatPromise<ExecuteResult>): void => {
  if (options.requestEntity instanceof Buffer) {
    return addRequestBufferEntity(handle, options, flatPromise);
    // tslint:disable-next-line:no-else-after-return
  } else if (options.requestEntity instanceof Readable) {
    return addRequestStreamEntity(handle, options, flatPromise);
  } else {
    // no request entity
    if (options.method === "POST" || options.method === "PUT") {
      handle.setOpt(Curl.option.READFUNCTION, (data, size, nitems) => {
        return 0;
      });
    }
  }
};

const addRequestBufferEntity = (handle: Easy, options: ExecuteOptions, flatPromise: FlatPromise<ExecuteResult>): void => {
  if (options.requestEntity instanceof Buffer) {
    // when request entity is a Buffer

    let offset = 0;
    const entityBuf = options.requestEntity;

    handle.setOpt(Curl.option.POSTFIELDSIZE, entityBuf.length);

    // https://curl.haxx.se/libcurl/c/CURLOPT_READFUNCTION.html
    handle.setOpt(Curl.option.READFUNCTION, (data, size, nitems) => {
      const maxBytesToRead = size * nitems;
      const bytesCopied = entityBuf.copy(data, 0, offset, maxBytesToRead + offset);
      offset += bytesCopied;
      return bytesCopied;
    });
  }
};

const addRequestStreamEntity = (handle: Easy, options: ExecuteOptions, flatPromise: FlatPromise<ExecuteResult>): void => {
  if (options.requestEntity instanceof Readable) {
    // when request entity is a Readable stream

    const entityStream = options.requestEntity;

    // setup a holder who is captured by the READFUNCTION lambda scope

    const streamState: RequestStreamState = {
      buf: null,
      bufBytesRead: 0,
      offset: 0,
      libcurlPaused: false,
      done: false
    };

    // watch the read stream...

    // when the stream is closed/ended ensure that if libcurl is still paused that it is resumed
    const whenDone = () => {
      streamState.done = true;
      if (streamState.libcurlPaused) {
        streamState.libcurlPaused = false;
        handle.pause(CurlPause.SendCont);
      }
    };

    entityStream.once("close", whenDone);
    entityStream.once("end", whenDone);
    entityStream.once("error", e => {
      // the READFUNCTION will abort libcurl + Promise.reject when it sees this
      streamState.error = e;
      // make sure to unpause libcurl if it's paused
      if (streamState.libcurlPaused) {
        streamState.libcurlPaused = false;
        handle.pause(CurlPause.SendCont);
      }
    });
    entityStream.on("data", (buf: Buffer) => {
      // pause the stream until the libcurl READFUNCTION fully reads the current buffer
      // necessary because the libcurl READFUNCTION may not read this whole Buffer in one round
      entityStream.pause();
      // reset the current buffer, offset and how many bytes have been read from the current buffer
      streamState.offset = 0;
      streamState.buf = buf;
      streamState.bufBytesRead = 0;
      // if the Easy handle is paused, continue it to re-invoke the READFUNCTION
      if (streamState.libcurlPaused) {
        streamState.libcurlPaused = false;
        handle.pause(CurlPause.SendCont);
      }
    });

    // https://curl.haxx.se/libcurl/c/CURLOPT_READFUNCTION.html
    handle.setOpt(Curl.option.READFUNCTION, (libcurlBuffer, size, nitems) => {

      // error on the stream, abort the READFUNCTION and reject the Promise
      if (streamState.error) {
        flatPromise.reject(streamState.error);
        return CurlReadFunc.Abort;
      }

      // maybe we're done...
      if (streamState.done && streamState.buf === null) {
        // holder.done might be true before last buf is read due to native libcurl READFUNCTION interaction
        // so, only be done with READFUNCTION is holder.buf is null
        return 0;
      }

      if (streamState.buf === null) {
        // no buffer to read from, need to pause libcurl and wait for data from the stream
        streamState.libcurlPaused = true;
        return CurlReadFunc.Pause;
      }

      // figure out how many bytes we can copy from the stream Buffer to the READFUNCTION buffer
      let maxBytesToRead = size * nitems; // this is the max size libcurl will allow us to put into the READFUNCTION buffer
      maxBytesToRead = streamState.buf.length < maxBytesToRead ? streamState.buf.length : maxBytesToRead; // stream Buffer might be smaller

      // copy bytes from the current stream Buffer into the libcurl READFUNCTION buffer
      // we need to use a stateful offset because READFUNCTION might take multiple rounds to read the complete stream Buffer
      const bytesCopied = streamState.buf.copy(
        libcurlBuffer,
        0,
        streamState.offset,
        maxBytesToRead + streamState.offset
      );

      streamState.bufBytesRead += bytesCopied;

      if (streamState.bufBytesRead === streamState.buf.length) {
        // read whole buffer, reset stream state and resume the stream
        streamState.buf = null;
        entityStream.resume();
      } else {
        // did not read the whole stream, track the offset in the stream state
        streamState.offset += bytesCopied;
      }

      // if we copied no bytes, go to pause mode...
      // we should have more bytes because we aren't logically done streaming
      return bytesCopied === 0 ? CurlReadFunc.Pause : bytesCopied;
    });

    entityStream.on("error", e => {
      log.error(`stream error: ${e.message}`);
      flatPromise.reject(e);
    });
  }
};

const addRequestHeaders = (handle: Easy, options: ExecuteOptions): void => {
  let headers: string[] = [];
  headers.push("Expect:"); // need this to disable Expect: 100-continue

  // if we're sending an entity and it's a Readable we need to ensure a chunked transfer encoding
  const safeHeaders: HttpHeaders = { ...options.headers };

  if (options.requestEntity instanceof Readable) {
    safeHeaders["Transfer-Encoding"] = "chunked";
  }

  headers = [...headers, ...headerMapToStrings(safeHeaders)];

  handle.setOpt(Curl.option.HTTPHEADER, headers);
};

const getErrorForCurlCode = (code: CurlCode): Error => {
  return new Error(
    `libcurl failed with [code=${code}], see https://curl.haxx.se/libcurl/c/libcurl-errors.html`
  );
};
