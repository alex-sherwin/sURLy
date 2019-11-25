import { Curl, CurlCode, Easy, Multi, CurlInfoDebug } from "node-libcurl";

import { startWebserver, stopWebserver, Headers } from "./webserver";
import { CurlClient } from "./curl";
import { log } from "./log";

const run = async () => {
  await startWebserver();
  const multi = new Multi();
  try {
    const promises: Promise<void>[] = [];
    for (let i = 0; i < 5; i++) {

      log.debug(`before request`);
      promises.push(
        CurlClient.execute({
          method: "GET",
          url: "http://localhost:9999/get",
          multi,
          headers: {
            [Headers.X_RESPONSE_TYPE]: Headers.X_RESPONSE_TYPE_VALUE_RANDOM,
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
    multi.close();
  }
  console.log(new Date().toISOString() + "- done waiting");
  stopWebserver();
};

run();
