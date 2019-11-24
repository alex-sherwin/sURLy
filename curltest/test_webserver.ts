import http from "http";
import _round from "lodash/round";

let webserver: http.Server | undefined;

const PORT = 9999;

export const startWebserver = (maxDelayMs: number) => {
  webserver = http.createServer((req, res) => {
    const sleepTime = _round(Math.random() * maxDelayMs, 0);

    setTimeout(() => {

      const bufs: Buffer[] = [];

      req.on("data", (buf) => {
        bufs.push(buf);
      });

      req.on("end", () => {
        const buf = Buffer.concat(bufs);
        res.statusCode = 200;
        console.log("here");
        res.end(`slept=${sleepTime}ms entityLen=${buf.length}`, () => {
          req.connection.destroy(); // shutdown any keep-alive'd connections
        });
      });

    }, sleepTime);

  });

  webserver.listen(9999);
};

export const stopWebserver = () => {
  if (webserver) {
    console.log(new Date().toISOString() + " - closing webserver...")
    webserver.close((err) => {
      if (err) {
        console.log(new Date().toISOString() + " - error closing webserver", err);
      }
      console.log(new Date().toISOString() + " - done closing webserver")
    });
  }
};
