// third party
import { Curl, CurlPause, CurlCode, Easy, Multi, CurlInfoDebug, CurlReadFunc } from "node-libcurl";
import { Readable } from "stream";
import _trimEnd from "lodash/trimEnd";
import v4 from "uuid/v4";

// local
import { createFlatPromise, FlatPromise } from "../../shared/FlatPromise";
import { log } from "../../shared/log";

interface Headers {
  [keyof: string]: string;
}

export interface ClientOptions {
  maxConnectionsPerHost?: number;
  maxConnections?: number;
}

export interface ExecuteOptions {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "HEAD" | "OPTIONS";
  headers?: Headers;
  compression?: boolean;
  entity?: Buffer | Readable;
  /** must be at least 1024 */
  receiveBufferSize?: number;
  sendBufferSize?: number;
  onInfo?: (epoch: number, message: string) => void;
  onHeaderSent?: (epoch: number, header: string) => void;
  onHeaderReceived?: (epoch: number, header: string) => void;
  onDataSent?: (epoch: number, buf: Buffer) => void;
  onDataReceived?: (epoch: number, buf: Buffer) => void;
}

const LAST_HEADER = Buffer.from("\r\n");

export interface ExecuteResult {
  status: number;
}

export class CurlClient {

  private handles: Easy[] = [];
  private flatPromises: FlatPromise<ExecuteResult>[] = [];

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

    const [handle, flatPromise] = this.createHandle();

    // need to handle buffer size out here since it might need to reject + return
    if (typeof options.receiveBufferSize === "number") {
      if (options.receiveBufferSize < 1024 || options.receiveBufferSize > 512 * 1024) {
        handle.close();
        return Promise.reject(new Error(`libcurl option "CURLOPT_BUFFERSIZE" cannot be set to a value < 1024 or > ${512 * 1024}, you requested ${options.receiveBufferSize}`));
      }
      handle.setOpt(Curl.option.BUFFERSIZE, options.receiveBufferSize);
    }
    if (typeof options.sendBufferSize === "number") {
      if (options.sendBufferSize < 16 * 1024 || options.sendBufferSize > 2 * 1024 * 1024) {
        handle.close();
        return Promise.reject(new Error(`libcurl option "UPLOAD_BUFFERSIZE" cannot be set to a value < ${16 * 1024} or > ${2 * 1024 * 1024}, you requested ${options.sendBufferSize}`));
      }
      handle.setOpt(Curl.option.UPLOAD_BUFFERSIZE, options.sendBufferSize);
    }

    const id = v4();

    addRequestCommonOptions(handle, options);
    addRequestHandlers(handle, options);
    addRequestCompression(handle, options);
    addRequestHeaders(handle, options);
    setRequestMethod(handle, options);
    addRequestEntity(handle, options, flatPromise, id);

    // register and execute the request handle
    this.registerHandle(handle, options);

    return flatPromise.promise;
  }

  private registerHandle(handle: Easy, options: ExecuteOptions) {

    if (options.entity instanceof Readable) {
      // if there is a Readable request entity, we need to wait until it's readable
      options.entity.once("readable", () => {
        // request entity is now readable, setup the handle
        this.multi.addHandle(handle);
      });

    } else {
      // add the handle immediately
      this.multi.addHandle(handle);
    }
  }

  private onMessage(err: Error | undefined, handle: Easy, errCode: CurlCode): void {
    const [flatPromise] = this.getHandleParts(handle);

    // node Error
    if (err) {
      return flatPromise.reject(err);
    }

    // libcurl error code (not http status code!)
    if (errCode !== CurlCode.CURLE_OK) {
      return flatPromise.reject(getErrorForCurlCode(errCode));
    }

    // we know since it's CurlCode.CURLE_OK that this will be a HTTP status code as a number
    const status = handle.getInfo(Curl.info.RESPONSE_CODE).data as number;

    // remove the Easy handle from the Multi instance
    this.multi.removeHandle(handle);
    // close the Easy handle
    handle.close();

    return flatPromise.resolve({ status });
  }

  private getHandleParts(handle: Easy): [FlatPromise<ExecuteResult>] {
    const idx = this.handles.indexOf(handle);
    if (idx === -1) {
      throw new Error(`failed to find index for handle`);
    }
    return [this.flatPromises[idx]];
  }

  private createHandle(): [Easy, FlatPromise<ExecuteResult>] {
    const flatPromise = createFlatPromise<ExecuteResult>();
    const handle = new Easy();
    this.handles.push(handle);
    this.flatPromises.push(flatPromise);
    return [handle, flatPromise];
  }

  public close() {
    this.multi.close();
  }
}

const addRequestCommonOptions = (handle: Easy, options: ExecuteOptions): void => {
  handle.setOpt(Curl.option.URL, options.url);
  handle.setOpt(Curl.option.NOPROGRESS, 1);
  handle.setOpt(Curl.option.HTTP_CONTENT_DECODING, 0);
  handle.setOpt(Curl.option.VERBOSE, 1);
};

const addRequestHandlers = (handle: Easy, options: ExecuteOptions): void => {
  handle.setOpt(Curl.option.DEBUGFUNCTION, (infoType, content) => {
    const now = Date.now();
    switch (infoType) {
      case CurlInfoDebug.Text:
        if (options.onInfo) {
          options.onInfo(now, content.toString().trim());
        }
        break;
      case CurlInfoDebug.HeaderOut:
        if (options.onHeaderSent) {
          if (content.length === 2 && LAST_HEADER.equals(content)) {
            // last header, do nothing
          } else {
            bufToHeaderLines(content).forEach((header) => options.onHeaderSent!(now, header));
          }
        }
        break;
      case CurlInfoDebug.HeaderIn:
        if (options.onHeaderReceived) {
          if (content.length === 2 && LAST_HEADER.equals(content)) {
            // last header, do nothing
          } else {
            bufToHeaderLines(content).forEach((header) => options.onHeaderReceived!(now, header));
          }
        }
        break;
      case CurlInfoDebug.DataOut:
        if (options.onDataSent) {
          options.onDataSent(now, content);
        }
        break;
      case CurlInfoDebug.DataIn:
        if (options.onDataReceived) {
          options.onDataReceived(now, content);
        }
        break;
    }

    // this must return CURLE_OK, the TypeScript type sig is wrong (says void)
    // TODO: submit a fix to node-libcurl
    // see https://curl.haxx.se/libcurl/c/CURLOPT_DEBUGFUNCTION.html
    return CurlCode.CURLE_OK;
  });
};

const setRequestMethod = (handle: Easy, options: ExecuteOptions): void => {

  if (options.method === "POST") {
    handle.setOpt(Curl.option.POST, 1);
  }

};

const addRequestEntity = (handle: Easy, options: ExecuteOptions, flatPromise: FlatPromise<ExecuteResult>, id: string): void => {

  if (options.entity instanceof Buffer) {
    // when request entity is a Buffer

    let offset = 0;
    const entityBuf = options.entity;

    handle.setOpt(Curl.option.POSTFIELDSIZE, entityBuf.length);

    // https://curl.haxx.se/libcurl/c/CURLOPT_READFUNCTION.html
    handle.setOpt(Curl.option.READFUNCTION, (data, size, nitems) => {
      const maxBytesToRead = size * nitems;
      const bytesCopied = entityBuf.copy(data, 0, offset, maxBytesToRead + offset);
      offset += bytesCopied;
      return bytesCopied;
    });

  } else if (options.entity instanceof Readable) {
    // when request entity is a Readable stream

    const entityStream = options.entity;

    let totalCopied = 0;

    const holder: { buf: Buffer | null; offset: number; bufBytesRead: number; libcurlPaused: boolean; done: boolean; error?: Error } = {
      buf: null,
      bufBytesRead: 0,
      offset: 0,
      libcurlPaused: false,
      done: false,
    };

    entityStream.once("close", () => {
      holder.done = true;
      if (holder.libcurlPaused) {
        holder.libcurlPaused = false;
        handle.pause(CurlPause.Cont);
      }
    });
    entityStream.once("end", () => {
      holder.done = true;
      if (holder.libcurlPaused) {
        holder.libcurlPaused = false;
        handle.pause(CurlPause.Cont);
      }
    });
    entityStream.once("error", (e) => {
      holder.error = e;
      if (holder.libcurlPaused) {
        holder.libcurlPaused = false;
        handle.pause(CurlPause.Cont);
      }
    });
    entityStream.on("data", (buf: Buffer) => {
      entityStream.pause();
      holder.offset = 0;
      holder.buf = buf;
      holder.bufBytesRead = 0;
      if (holder.libcurlPaused) {
        holder.libcurlPaused = false;
        handle.pause(CurlPause.Cont);
      }
    });

    // https://curl.haxx.se/libcurl/c/CURLOPT_READFUNCTION.html
    handle.setOpt(Curl.option.READFUNCTION, (libcurlBuffer, size, nitems) => {

      if (holder.error) {
        flatPromise.reject(holder.error);
        return CurlReadFunc.Abort;
      }

      if (holder.done && holder.buf === null) {
        // holder.done might be true before last buf is read due to native lib interaction
        // so, only be done with READFUNCTION is holder.buf is null
        log.warn(`finished total bytes=${totalCopied.toLocaleString()}`);
        return 0;
      }

      if (holder.buf === null) {
        // need to pause and wait for data
        holder.libcurlPaused = true;
        return CurlReadFunc.Pause;
      }

      let maxBytesToRead = size * nitems;
      maxBytesToRead = holder.buf.length < maxBytesToRead ? holder.buf.length : maxBytesToRead;

      const bytesCopied = holder.buf.copy(libcurlBuffer, 0, holder.offset, maxBytesToRead + holder.offset);

      holder.bufBytesRead += bytesCopied;

      if (holder.bufBytesRead === holder.buf.length) {
        // read whole buffer, reset tracking and resume the stream
        holder.buf = null;
        entityStream.resume();
      } else {
        // did not read the whole stream, track the offset
        holder.offset += bytesCopied;
      }

      totalCopied += bytesCopied;

      return bytesCopied === 0 ? CurlReadFunc.Pause : bytesCopied;

    });

    entityStream.on("error", (e) => {
      log.error(`stream error: ${e.message}`);
      flatPromise.reject(e);
    });

  }
};

const addRequestCompression = (handle: Easy, options: ExecuteOptions): void => {
  if (options.compression) {
    // enables automatic Accept-Encoding request header + de-compression of results when using empty string ""
    handle.setOpt(Curl.option.ACCEPT_ENCODING, "");
  }
};

const addRequestHeaders = (handle: Easy, options: ExecuteOptions): void => {
  let headers: string[] = [];
  headers.push("Expect:"); // need this to disable Expect: 100-continue

  // if we're sending an entity and it's a Readable we need to ensure a chunked transfer encoding
  const safeHeaders: Headers = { ...options.headers };

  if (options.entity instanceof Readable) {
    safeHeaders["Transfer-Encoding"] = "chunked";
  }

  headers = [...headers, ...headerMapToStrings(safeHeaders)];

  handle.setOpt(Curl.option.HTTPHEADER, headers);
};

const bufToHeaderLines = (headers: Buffer): string[] => {
  const str = _trimEnd(headers.toString(), "\r\n");
  if (str.indexOf("\n") !== -1) {
    // multiple headers
    const rawSplit = str.split("\n");
    return rawSplit.map((it) => _trimEnd(it, "\r\n")).filter((it) => it.length > 0);
  }
  // single header
  return [str].filter((it) => it.length > 0);
};

const headerMapToStrings = (headers: Headers): string[] => {
  const strings: string[] = [];
  for (const headerName in headers) {
    const headerValue = headers[headerName];
    strings.push(`${headerName}: ${headerValue}`);
  }
  return strings;
};

const getErrorForCurlCode = (code: CurlCode): Error => {
  return new Error(
    `libcurl failed with [code=${code}], see https://curl.haxx.se/libcurl/c/libcurl-errors.html`
  );
};
