// third party

// electron
import { ipcMain } from "electron";

// local
import { log } from "../log";
import { SHARED_CURL_CLIENT } from "../curl";

log.warn("registering curl-test");

ipcMain.handle("curl-test", async (event, arg: boolean) => {

  log.info("curl test");

  const result = await SHARED_CURL_CLIENT.execute({
    url: "http://localhost:9990/test123",
    method: "GET",
  });

  const elapsedNanos = result.timing.endNano - result.timing.initNano;
  const elapsedMillis = elapsedNanos / 1_000_000;

  log.info(`total time=${elapsedMillis} ms`);

  return "ok";
});
