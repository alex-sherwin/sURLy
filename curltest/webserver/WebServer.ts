import http from "http";
import _round from "lodash/round";
import crypto from "crypto";

// local
import { log } from "../log";

// reaelly local
import { Headers } from "./headers";

let webserver: http.Server | undefined;

const PORT = 9999;
const DEFAULT_MAX_RESPONSE_RANDOM_BYTES = 1025; // not a typo, force extra buffers for default sizes of 16, 32, 64, 128 etc.

export const startWebserver = () => {

  log.info(`starting webserver on port ${PORT}...`);

  webserver = http.createServer((req, res) => {

    log.silly(`starting to handle web request`);

    // maybe bail w/ error
    const responseType = req.headers[Headers.X_RESPONSE_TYPE];
    if (responseType !== Headers.X_RESPONSE_TYPE_VALUE_ECHO && responseType !== Headers.X_RESPONSE_TYPE_VALUE_RANDOM) {
      // dont know how to respond
      res.statusCode = 500;
      return res.end(`no "${Headers.X_RESPONSE_TYPE}" header set`);
    }

    const processResponse = () => {

      const bufs: Buffer[] = [];

      req.on("data", (buf) => {
        bufs.push(buf);
      });

      req.on("end", () => {

        let responseBuf: Buffer;

        if (responseType === "echo") {
          responseBuf = Buffer.concat(bufs);
        } else {
          responseBuf = getRandomResponseBytes(req);
        }

        res.statusCode = getResponseStatusCode(req);

        log.debug(`ending web request entity len=${responseBuf.length}`);
        return res.end(responseBuf);
      });

    };

    const delayMs = getResponseDelayMillis(req);

    if (delayMs > 0) {
      setTimeout(processResponse, delayMs);
    } else {
      processResponse();
    }

  });

  webserver.listen(PORT, () => {
    log.info(`finished starting webserver`);
  });
};

const getResponseDelayMillis = (req: http.IncomingMessage): number => {
  const value = req.headers[Headers.X_MAX_RESPONSE_DELAY_MILLIS];
  if (typeof value === "string") {
    const maxDelayMs = parseInt(value);
    return _round(Math.random() * maxDelayMs, 0);
  }
  return 0;
};

const getMaxRandomResponseBytes = (req: http.IncomingMessage): number => {
  const value = req.headers[Headers.X_RADNOM_RESPONSE_BYTES_LENGTH];
  if (typeof value === "string") {
    return parseInt(value, 10);
  }
  return DEFAULT_MAX_RESPONSE_RANDOM_BYTES;
};

const getRandomResponseBytes = (req: http.IncomingMessage): Buffer => {
  return crypto.randomBytes(getMaxRandomResponseBytes(req));
};

const getResponseStatusCode = (req: http.IncomingMessage): number => {
  const value = req.headers[Headers.X_STATUS_CODE];
  if (typeof value === "string") {
    return parseInt(value);
  }
  return 200;
};

export const stopWebserver = () => {
  if (webserver) {
    log.info("closing webserver...")
    webserver.close((err) => {
      if (err) {
        log.error("error closing webserver", err);
      }
      log.info("done closing webserver")
    });
  }
};
