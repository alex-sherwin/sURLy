// third party
import { Curl, CurlCode, Easy, Multi, CurlInfoDebug } from "node-libcurl";
import { Readable } from "stream";

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
}

export class CurlClient {

  private handles: Easy[] = [];
  private bufs: Buffer[][] = [];
  private flatPromises: FlatPromise<void>[] = [];

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

  public execute(options: ExecuteOptions): Promise<void> {

    const [handle, flatPromise, handleBufs] = this.createHandle();

    handle.setOpt(Curl.option.WRITEFUNCTION, (data, size, nmemb) => this.onData(data, size, nmemb, handleBufs));

    if (options.compression) {
      // enables automatic Accept-Encoding request header + de-compression of results when using empty string ""
      handle.setOpt(Curl.option.ACCEPT_ENCODING, "");
    }

    handle.setOpt(Curl.option.URL, options.url);
    handle.setOpt(Curl.option.NOPROGRESS, 1);
    handle.setOpt(Curl.option.HTTP_CONTENT_DECODING, 0);

    handle.setOpt(Curl.option.VERBOSE, 1);
    handle.setOpt(Curl.option.DEBUGFUNCTION, (infoType, content) => {

      switch (infoType) {
        case CurlInfoDebug.Text:
          // log.warn(`info: ${content.toString().trim()}`);
          break;
        case CurlInfoDebug.HeaderIn:
          // log.warn(`got header`);
          break;
        case CurlInfoDebug.DataIn:
          // log.warn(`got data`);
          break;
      }

      // this must return CURLE_OK, the type sig is wrong (says void)
      // see https://curl.haxx.se/libcurl/c/CURLOPT_DEBUGFUNCTION.html
      return CurlCode.CURLE_OK;
    });


    let headers: string[] = [];
    headers.push("Expect:"); // need this to disable Expect: 100-continue

    if (options.headers) {
      headers = [...headers, ...headerMapToStrings(options.headers)];
    }

    handle.setOpt(Curl.option.HTTPHEADER, headers);

    // register and execute the request handle
    // log.debug("curl register handle");
    this.multi.addHandle(handle);

    // });

    return flatPromise.promise;

  };

  // tslint:disable-next-line:max-line-length
  private onMessage(err: Error | undefined, handle: Easy, errCode: CurlCode): void {

    const [flatPromise, handleBufs] = this.stuffForHandle(handle);

    log.debug("curl onMessage");

    // node Error
    if (err) {
      log.warn(`error: ` + err.message);
      return flatPromise.reject(err);
    }

    // libcurl error code (not http status code!)
    if (errCode !== CurlCode.CURLE_OK) {
      log.warn(`errCode: ` + errCode);
      return flatPromise.reject(getErrorForCurlCode(errCode));
    }

    // we know since it's CurlCode.CURLE_OK that this will be a HTTP status code as a number
    const statusCode = handle.getInfo(Curl.info.RESPONSE_CODE).data as number;

    const buf = Buffer.concat(handleBufs);

    log.warn(`got status code=${statusCode}, resp entity len=${buf.length}`);

    this.multi.removeHandle(handle);
    handle.close();

    log.warn(`finished onMessage`);
    flatPromise.resolve();

  };

  private onData(data: Buffer, size: number, nmemb: number, handleBufs: Buffer[]): number {
    handleBufs.push(data);
    return size * nmemb;
  };

  private stuffForHandle(handle: Easy): [FlatPromise<void>, Buffer[]] {
    const idx = this.handles.indexOf(handle);
    if (idx === -1) {
      throw new Error(`failed to find index for handle`);
    }
    return [this.flatPromises[idx], this.bufs[idx]];
  };

  private createHandle(): [Easy, FlatPromise<void>, Buffer[]] {
    const flatPromise = createFlatPromise<void>();
    const handleBufs: Buffer[] = [];
    const handle = new Easy();
    this.handles.push(handle);
    this.flatPromises.push(flatPromise);
    this.bufs.push(handleBufs);
    return [handle, flatPromise, handleBufs];
  }

  public close() {
    this.multi.close();
  }

}

const headerMapToStrings = (headers: Headers): string[] => {
  const strings: string[] = [];
  for (const headerName in headers) {
    const headerValue = headers[headerName];
    strings.push(`${headerName}: ${headerValue}`);
  }
  return strings;
};

const getErrorForCurlCode = (code: CurlCode): Error => {
  return new Error(`libcurl failed with [code=${code}], see https://curl.haxx.se/libcurl/c/libcurl-errors.html`);
};
