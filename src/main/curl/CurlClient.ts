// third party
import { Curl, CurlCode, Easy, Multi, CurlInfoDebug } from "node-libcurl";

// local
import { log } from "../../shared/log";

interface Headers {
  [keyof: string]: string;
}

export interface Options {
  headers?: Headers;
  url: string;
}

export const execute = (options: Options): Promise<void> => {

  return new Promise((resolve, reject) => {

    const multi: Multi = new Multi();

    const bufs: Buffer[] = [];

    // when handle is done (ok or error)
    multi.onMessage((err, handle, errCode) => {

      // console.log("curl onMessage");

      // log.debug("curl onMessage");

      // node Error
      if (err) {
        return reject(err);
      }

      // libcurl error code (not http status code!)
      if (errCode !== CurlCode.CURLE_OK) {
        return reject(getErrorForCurlCode(errCode));
      }

      // we know since it's CurlCode.CURLE_OK that this will be a HTTP status code as a number
      // const statusCode = handle.getInfo(Curl.info.RESPONSE_CODE).data as number;

      // const buf = Buffer.concat(bufs);

      multi.removeHandle(handle);
      handle.close();
      multi.close();

      resolve();

    });

    const handle = new Easy();

    const onData = (data: Buffer, size: number, nmemb: number): number => {
      // log.silly("curl onData");
      bufs.push(data);
      return size * nmemb;
    };

    // handle.setOpt(Curl.option.ACCEPT_ENCODING, ""); // enables automatic Accept-Encoding request header + de-compression of results

    handle.setOpt(Curl.option.URL, options.url);
    handle.setOpt(Curl.option.WRITEFUNCTION, onData);
    handle.setOpt(Curl.option.NOPROGRESS, 1);
    handle.setOpt(Curl.option.HTTP_CONTENT_DECODING, 0);

    handle.setOpt(Curl.option.VERBOSE, 1);
    handle.setOpt(Curl.option.DEBUGFUNCTION, (infoType, content) => {

      switch (infoType) {
        case CurlInfoDebug.Text:
          log.warn(`info: ${content.toString().trim()}`);
          break;
        case CurlInfoDebug.HeaderIn:
          log.warn(`got header`);
          break;
        case CurlInfoDebug.DataIn:
          log.warn(`got data`);
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

  });
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
