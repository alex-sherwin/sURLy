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

let reqNum = 0;

export const startWebserver = (port: number): Promise<http.Server> => {

  return new Promise((resolve, reject) => {

    const app = express();

    // app.use(compression({
    //   threshold: 5,
    //   filter: (req, res) => {
    //     const acceptEncoding = req.header("accept-encoding");
    //     if (acceptEncoding && acceptEncoding.includes("gzip")) {
    //       // log.warn("use compression");
    //       return true;
    //     }
    //     // log.warn("no compression");
    //     return false;
    //   }
    // }));

    const router = express.Router();

    router.all("*", (req, res) => {
      // res.status(200);
      // res.write("hello world");
      // res.end();

      const currentReqNum = ++reqNum;

      log.debug(`${currentReqNum} - starting to handle ${req.method} web request`);

      // for (const headerName in req.headers) {
      //   const value = req.headers[headerName];
      //   if (Array.isArray(value)) {
      //     for (const itrValue of value) {
      //       log.silly(`<< [${headerName}: ${itrValue}]`);
      //     }
      //   } else {
      //     log.silly(`<< [${headerName}: ${value}]`);
      //   }
      // }

      // maybe bail w/ error
      const responseType = req.headers[Headers.X_RESPONSE_TYPE];
      if (responseType !== Headers.X_RESPONSE_TYPE_VALUE_ECHO && responseType !== Headers.X_RESPONSE_TYPE_VALUE_RANDOM) {
        // dont know how to respond
        res.statusCode = 500;
        return res.end(`no "${Headers.X_RESPONSE_TYPE}" header set`);
      }

      const processResponse = () => {

        if (responseType === "echo") {

          const bufs: Buffer[] = [];

          req.on("data", (buf) => {
            bufs.push(buf);
          });

          req.on("end", () => {

            let responseBuf: Buffer;

            const reqBuf = Buffer.concat(bufs);

            log.silly(`server received entity len=${reqBuf.length}`);

            responseBuf = reqBuf;
            res.setHeader("Content-Type", req.header("content-type") || "application/octet-stream");

            res.statusCode = getResponseStatusCode(req);

            log.debug(`${currentReqNum} - ending web request req len=${reqBuf.length} resp len=${responseBuf.length}`);

            return res.end(responseBuf);
          });

        } else {
          log.debug(`${currentReqNum} - ending web request`);
          res.setHeader("Content-Type", "application/octet-stream");
          return res.end(getRandomResponseBytes(req), () => {
            log.info(`${currentReqNum} - done ending`)
          });

        }

      };

      const delayMs = getResponseDelayMillis(req);

      if (delayMs > 0) {
        log.debug(`${currentReqNum} - delaying by ${delayMs} millis`);
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
  const value = req.headers[Headers.X_RESPONSE_DELAY_MILLIS];
  if (typeof value === "string") {
    return parseInt(value, 10);
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

const HELLO_WORLD = Buffer.from("hello world");

const getRandomResponseBytes = (req: http.IncomingMessage): Buffer => {
  return HELLO_WORLD;
  // return crypto.randomBytes(getMaxRandomResponseBytes(req));
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
