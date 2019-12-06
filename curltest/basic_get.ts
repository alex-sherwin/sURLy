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
      const respLen = _round(Math.random() * 1025, 0).toString();
      // const respLen = (5 * 1024 + 1).toString();
      // const respLen = "10";
      log.debug(`before request (resp len=${respLen})`);
      const host = i % 2 === 0 ? "localhost" : "127.0.0.1";
      const port = i % 2 === 0 ? "9990" : "9991";
      const p = client.execute({
        method: "GET",
        url: `http://${host}:${port}/get`,
        headers: {
          [Headers.X_RESPONSE_TYPE]: Headers.X_RESPONSE_TYPE_VALUE_RANDOM,
          // [Headers.X_RADNOM_RESPONSE_BYTES_LENGTH]: respLen,
          [Headers.X_RADNOM_RESPONSE_BYTES_LENGTH]: "10",
          "Accept-Encoding": "gzip",
          "X-TEST": "abc ",
          "X-TEST-2": "abc  ",
        },
      });
      promises.push(p);
      // log.debug(`after request`);
    }

    await Promise.all(promises);

    log.debug(`after all`);
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
