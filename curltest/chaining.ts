import _round from "lodash/round";

import { startWebserver, stopWebserver, Headers } from "./webserver";
import { CurlClient, ExecuteResult } from "./curl";
import { log } from "./log";

log.warn(`${process.hrtime.bigint()}`);

setTimeout(() => {
  log.warn(`${process.hrtime.bigint()}`);
}, 1000);

const run = async () => {
  // const webserver1 = await startWebserver(9990);

  const client = new CurlClient({
    maxConnectionsPerHost: 10
  });

  try {

    log.error("before 1");

    // let responseEntity = fs.createWriteStream("/Users/asherwin/Desktop/out", {
    //   highWaterMark: 128 * 1024,
    // });

    const p1 = await doGET(client);

    log.error("after 1 wait");

    // responseEntity = fs.createWriteStream("/Users/asherwin/Desktop/out", {
    //   highWaterMark: 128 * 1024,
    // });

    log.error("before 2");

    const promises: Promise<ExecuteResult>[] = [];

    for (let i = 0; i < 100; i++) {
      promises.push(doGET(client));
    }

    const results = await Promise.all(promises);

    for (const result of results) {

      const elapsedMillis = (result.timing.endNano - result.timing.startNano) / 1_000_000;
      console.log(`${new Date().toISOString()} - elapsed ${elapsedMillis} ms`);
    }

  } catch (e) {
    console.log(e);
  } finally {
    log.debug("closing curl client");
    client.close();
  }
  console.log(new Date().toISOString() + "- done waiting");
  // stopWebserver(webserver1);
};

const doGET = (client: CurlClient): Promise<ExecuteResult> => {
  return client.execute({
    method: "GET",
    url: `http://localhost:9990/post`,
    headers: {
      [Headers.X_STATUS_CODE]: "418",
      [Headers.X_RESPONSE_TYPE]: Headers.X_RESPONSE_TYPE_VALUE_RANDOM,
      [Headers.X_RADNOM_RESPONSE_BYTES_LENGTH]: "12",
    },
    requestEntity: Buffer.from("boo"),
  });

};

run();
