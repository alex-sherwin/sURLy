import http from "http";
import _round from "lodash/round";
import crypto from "crypto";

import express from "express";
import compression from "compression";

// local
import { log } from "../log";

// reaelly local
import { Headers } from "./headers";

// not a typo, force extra buffers for default sizes of 16, 32, 64, 128 etc.
const DEFAULT_MAX_RESPONSE_RANDOM_BYTES = 1025;

export const startWebserver = (port: number): Promise<http.Server> => {

  return new Promise((resolve, reject) => {

    const app = express();

    app.use(compression({
      threshold: 5,
      filter: (req, res) => {
        const acceptEncoding = req.header("accept-encoding");
        if (acceptEncoding && acceptEncoding.includes("gzip")) {
          log.warn("use compression");
          return true;
        }
        log.warn("no compression");
        return false;
      }
    }));

    const router = express.Router();

    router.all("*", (req, res) => {
      // res.status(200);
      // res.write("hello world");
      // res.end();


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

          const reqBuf = Buffer.concat(bufs);

          if (responseType === "echo") {
            responseBuf = reqBuf;
          } else {
            responseBuf = getRandomResponseBytes(req);
          }

          res.statusCode = getResponseStatusCode(req);

          responseBuf = Buffer.from("hello world");

          res.setHeader("Content-Type", "text/plain");

          log.debug(`ending web request req len=${reqBuf.length} resp len=${responseBuf.length} [${responseBuf.toString("utf8")}]`);
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

    app.use("/", router);

    log.info(`starting webserver on port ${port}...`);

    try {
      const webserver = app.listen(port, () => {
        log.info(`finished starting webserver`);
        return resolve(webserver);
      });
    } catch (err) {
      return reject(err);
    }

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

export const stopWebserver = (webserver: http.Server) => {
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
