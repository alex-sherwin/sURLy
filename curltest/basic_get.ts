import { Curl, CurlCode, Easy, Multi } from "node-libcurl";
import { startWebserver, stopWebserver } from "./test_webserver";

const runRequest = (): Promise<void> => {
  return new Promise((resolve, reject) => {

    const multi: Multi = new Multi();

    const bufs: Buffer[] = [];

    // when handle is done (ok or error)
    multi.onMessage((err, handle, errCode) => {

      const responseCode = handle.getInfo(Curl.info.RESPONSE_CODE);
      const statusCode = responseCode.data;

      console.log("responseCode", responseCode);
      console.log("statusCode", statusCode);

      const buf = Buffer.concat(bufs);

      console.log("total response buf size=" + buf.length);

      multi.removeHandle(handle);
      handle.close();

      resolve();

    });

    const handle = new Easy();

    const onData = (data: Buffer, size: number, nmemb: number): number => {
      bufs.push(data);
      return size * nmemb;
    };

    handle.setOpt('URL', `http://localhost:9999/get`);
    handle.setOpt('WRITEFUNCTION', onData);

    multi.addHandle(handle);

  });
};

const run = async () => {
  startWebserver(0);
  for (let i = 0; i < 1; i++) {
    await runRequest();
  }
  console.log(new Date().toISOString() + "- done waiting");
  stopWebserver();
};

run();
