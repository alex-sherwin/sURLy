import { startWebserver, stopWebserver, Headers } from "./webserver";
import { CurlClient } from "./curl";
import { log } from "./log";

const run = async () => {
  await startWebserver();
  try {
    for (let i = 0; i < 3; i++) {

      log.debug(`before request`);
      await CurlClient.execute({
        url: "http://localhost:9999/get",
        headers: {
          [Headers.X_RESPONSE_TYPE]: Headers.X_RESPONSE_TYPE_VALUE_RANDOM,
        },
      });
      log.debug(`after request`);

    }
  } catch (e) {
    console.log(e.message, e);
  }
  console.log(new Date().toISOString() + "- done waiting");
  stopWebserver();
};

run();
