// third party
import { Curl, CurlCode, Easy, Multi, CurlInfoDebug } from "node-libcurl";
import { Readable } from "stream";

// local
import { log } from "../../shared/log";
import { createFlatPromise, FlatPromise } from "../../shared/FlatPromise";
import ReactResizeDetector from "react-resize-detector";

interface Headers {
  [keyof: string]: string;
}

export interface Options {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "HEAD" | "OPTIONS";
  headers?: Headers;
  multi?: Multi;
  compression?: boolean;
  entity?: Buffer | Readable;
}

// tslint:disable-next-line:max-line-length
const onMessage = (err: Error | undefined, handle: Easy, errCode: CurlCode, bufs: Buffer[], multi: Multi, options: Options, { resolve, reject }: FlatPromise<void>): void => {

  log.debug("curl onMessage");

  // node Error
  if (err) {
    log.warn(`error: ` + err.message);
    return reject(err);
  }

  // libcurl error code (not http status code!)
  if (errCode !== CurlCode.CURLE_OK) {
    log.warn(`errCode: ` + errCode);
    return reject(getErrorForCurlCode(errCode));
  }

  // we know since it's CurlCode.CURLE_OK that this will be a HTTP status code as a number
  const statusCode = handle.getInfo(Curl.info.RESPONSE_CODE).data as number;

  const buf = Buffer.concat(bufs);

  log.warn(`got status code=${statusCode}, resp entity len=${buf.length}`);

  multi.removeHandle(handle);
  handle.close();

  if (!options.multi) {
    // if this was a locally created multi, close it
    log.warn(`closing local multi`);
    multi.close();
  }

  log.warn(`finished onMessage`);
  resolve();

};

const onData = (data: Buffer, size: number, nmemb: number, bufs: Buffer[]): number => {
  bufs.push(data);
  return size * nmemb;
};

// TODO: FIX ONMEESSAGE
// * maybe use a Context that needs to be re-passed to execute() which tracks multi and registers onMessage once, tracks handles, bufs, etc
// * switch to a class and use local variables to track multi, handles, bufs, etc.

export const execute = (options: Options): Promise<void> => {

  const flatPromise = createFlatPromise<void>();

  // return new Promise((resolve, reject) => {

  const multi: Multi = options.multi ?? new Multi();

  const bufs: Buffer[] = [];

  // when handle is done (ok or error)
  // TODO: FIXME: when Multi is re-used for concurrency this is reset for each request
  multi.onMessage((err, handle, errCode) => onMessage(err, handle, errCode, bufs, multi, options, flatPromise));

  const handle = new Easy();

  handle.setOpt(Curl.option.WRITEFUNCTION, (data, size, nmemb) => onData(data, size, nmemb, bufs));

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
  multi.addHandle(handle);

  // });

  return flatPromise.promise;
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
  return new Error(`libcurl failed with [code=${code}], see https://curl.haxx.se/libcurl/c/libcurl-errors.html`);
};
