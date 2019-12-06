import fs from "fs";
import { Curl, CurlCode, Easy, Multi, CurlInfoDebug } from "node-libcurl";
import _round from "lodash/round";

import { startWebserver, stopWebserver, Headers } from "./webserver";
import { CurlClient, ExecuteResult } from "./curl";
import { log } from "./log";

const run = async () => {
  const webserver1 = await startWebserver(9990);
  const webserver2 = await startWebserver(9991);

  const client = new CurlClient({
    maxConnectionsPerHost: 4
  });

  try {
    log.debug(`before all requests`);

    const promises: Promise<ExecuteResult>[] = [];
    for (let i = 0; i < 1; i++) {
      
      const requestEntity = fs.createReadStream("/Users/asherwin/Desktop/sprinklers.jpg", {
        highWaterMark: 1024 * 128,
      });

      const respLen = _round(Math.random() * 1025, 0).toString();
      // const respLen = (5 * 1024 + 1).toString();
      // const respLen = "10";
      log.debug(`before request (resp len=${respLen})`);
      const p = client.execute({
        method: "GET",
        url: `http://localhost:9990/post`,
        headers: {
          [Headers.X_RESPONSE_TYPE]: Headers.X_RESPONSE_TYPE_VALUE_ECHO,
          // [Headers.X_RADNOM_RESPONSE_BYTES_LENGTH]: respLen,
          // "Accept-Encoding": "gzip, deflate",
          "X-TEST": "abc ",
          "X-TEST-2": "abc  ",
          "Content-Type": "image/jpg",
        },
        requestEntity,
        sendBufferSize: 128 * 1024 + 16,
        receiveBufferSize: 128 * 1024,
      });
      promises.push(p);
      // log.debug(`after request`);
    }

    await Promise.all(promises);

    log.debug(`after all`);

    const result = await promises[0];
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.log(e.message, e);
  } finally {
    client.close();
  }
  console.log(new Date().toISOString() + "- done waiting");
  stopWebserver(webserver1);
  stopWebserver(webserver2);
};

run();
