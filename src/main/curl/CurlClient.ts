// third party
import { Curl, CurlCode, Easy, Multi, CurlInfoDebug } from "node-libcurl";
import { Readable, Writable } from "stream";
import _trimEnd from "lodash/trimEnd";

// local
import { log } from "../../shared/log";
import { createFlatPromise, FlatPromise } from "../../shared/FlatPromise";

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
  bufferSize?: number;
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

    // need to handle buffer size out here since it might reject
    if (typeof options.bufferSize === "number") {
      if (options.bufferSize < 1024) {
        handle.close();
        return Promise.reject(new Error(`libcurl option "CURLOPT_BUFFERSIZE" cannot be set to a value < 1024, you requested ${options.bufferSize}`));
      }
      handle.setOpt(Curl.option.BUFFERSIZE, options.bufferSize);
    }

    addRequestCommonOptions(handle, options);
    addRequestHandlers(handle, options);
    addRequestCompression(handle, options);
    addRequestHeaders(handle, options);

    // register and execute the request handle
    this.multi.addHandle(handle);

    return flatPromise.promise;
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

    this.multi.removeHandle(handle);
    handle.close();

    flatPromise.resolve({ status });
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

const addRequestCompression = (handle: Easy, options: ExecuteOptions): void => {
  if (options.compression) {
    // enables automatic Accept-Encoding request header + de-compression of results when using empty string ""
    handle.setOpt(Curl.option.ACCEPT_ENCODING, "");
  }
};

const addRequestHeaders = (handle: Easy, options: ExecuteOptions): void => {
  let headers: string[] = [];
  headers.push("Expect:"); // need this to disable Expect: 100-continue

  if (options.headers) {
    headers = [...headers, ...headerMapToStrings(options.headers)];
  }

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
