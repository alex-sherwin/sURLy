import { Curl, CurlCode, Easy, Multi, CurlInfoDebug } from "node-libcurl";
import _round from "lodash/round";

import { startWebserver, stopWebserver, Headers } from "./webserver";
import { CurlClient } from "./curl";
import { log } from "./log";

const run = async () => {
  await startWebserver();

  const client = new CurlClient();

  try {
    const promises: Promise<void>[] = [];
    for (let i = 0; i < 10; i++) {

      const respLen = _round(Math.random() * 1025, 0).toString();
      // const respLen = "10";
      log.debug(`before request (resp len=${respLen})`);
      promises.push(
        client.execute({
          method: "GET",
          url: "http://localhost:9999/get",
          headers: {
            [Headers.X_RESPONSE_TYPE]: Headers.X_RESPONSE_TYPE_VALUE_RANDOM,
            [Headers.X_RADNOM_RESPONSE_BYTES_LENGTH]: respLen,
          },
        })
      );
      log.debug(`after request`);

    }

    await Promise.all(promises);

    log.debug(`after all`);


  } catch (e) {
    console.log(e.message, e);
  } finally {
    client.close();
  }
  console.log(new Date().toISOString() + "- done waiting");
  stopWebserver();
};

run();
