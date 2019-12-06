import _round from "lodash/round";
import { Server } from "http";

import { startWebserver, stopWebserver, Headers } from "./webserver";

let webserver: Server | undefined;

const run = async () => {
  webserver = await startWebserver(9990);
  console.log(new Date().toISOString() + "- done waiting for server to start");
};

run();

process.on("SIGTERM", () => {
  if (webserver) {
    stopWebserver(webserver);
  }
});