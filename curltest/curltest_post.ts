import http from "http";
import { URL } from "url";
import { Curl, Easy, Multi } from "node-libcurl";
import _round from "lodash/round";
import crypto from "crypto";

const RUN_COUNT = 10;
const REQ_COUNT = 1000;
const MAX_WAIT_MS = 100;
const MAX_CONCURRENCY = 100;

let webserver: http.Server | undefined;

let maxDelay = 0;

const startWebserver = () => {
  webserver = http.createServer((req, res) => {
    const sleepTime = _round(Math.random() * MAX_WAIT_MS, 0);
    // const sleepTime = 0;
    if (sleepTime > maxDelay) {
      maxDelay = sleepTime;
    }
    const url = new URL("http://localhost:9999" + req.url!);
    const num: string = url.searchParams.get("num")!;

    // setTimeout(() => {

    const bufs: Buffer[] = [];

    req.on("data", (buf) => {
      // console.log(">>> got entity buf.length=" + buf.length);
      bufs.push(buf);
    });

    req.on("end", () => {

      const buf = Buffer.concat(bufs);

      // console.log(`* req entity length=${buf.length}`);
      // console.log(`* ${req.method}`);
      // console.log(`* ${JSON.stringify(req.headers, null, "")}`);
      // console.log(`* ${req.headers["user-agent"]}`);
      // console.log(`* ${req.headers["content-type"]}`);

      res.statusCode = 200;
      res.end(`num=${num} slept=${sleepTime}ms entityLen=${buf.length}`);

    });


    // }, sleepTime);

    // res.statusCode = 200;
    // res.end(`num=${num} slept=${sleepTime}ms`);

  });
  webserver.listen(9999);
};

const stopWebserver = () => {
  if (webserver) {
    console.log(new Date().toISOString() + " - closing webserver...")
    webserver.close(() => {
      console.log(new Date().toISOString() + " - done closing webserver")
    });
  }
};

const runRequests = (): Promise<number> => {
  return new Promise((resolve, reject) => {

    let missingDataCount = 0;

    let finishedCount = 0;

    const multi: Multi = new Multi();

    const handles: Easy[] = [];
    const bufs: (Buffer | null)[] = [];

    let firstDone: number | null = null;
    let lastDone: number | null = null;

    let startedCount = 0;

    multi.onMessage((err, handle, errCode) => {

      if (!firstDone) {
        firstDone = Date.now();
      }

      const multiCount = multi.getCount();
      if (multi.getCount() > MAX_CONCURRENCY) {
        console.log("** MAX CONCURRENCY EXCEEDED=" + multiCount);
      }

      const responseCode = handle.getInfo('RESPONSE_CODE').data

      const handleNum = handles.indexOf(handle);

      const buf = bufs[handleNum];

      if (!buf) {
        console.log("*** MISSING BUF FOR handleNum=" + handleNum);
        missingDataCount++;
      } else {
        // console.log(new Date().toISOString() + " - done " + handleNum + " status=" + responseCode + " data=" + bufs[handleNum]!.toString());
      }


      multi.removeHandle(handle);
      handle.close();

      if (++finishedCount === REQ_COUNT) {
        lastDone = Date.now();
        const totalElapsedSinceFirst = lastDone! - firstDone!;
        console.log(new Date().toISOString() + " - elapsed ms=" + totalElapsedSinceFirst + " max delay=" + maxDelay);
        multi.close();
        resolve(missingDataCount);
      }
    });


    const startRequest = () => {

      if (startedCount >= REQ_COUNT) {
        // console.log(new Date().toISOString() + " - finished starting requests");
        return; // done
      }

      if (multi.getCount() >= MAX_CONCURRENCY) {
        // console.log(new Date().toISOString() + " - delaying start...");
        // return process.nextTick(startRequest);
        setTimeout(startRequest, 1);
        return;
      }

      const handle = new Easy();

      handle.setOpt(Curl.option.USERAGENT, "node-libcurl");

      handles.push(handle);
      bufs.push(null);

      const onData = (data: Buffer, size: number, nmemb: number): number => {
        const idx = handles.indexOf(handle);
        if (data === null) {
          console.log("*** GOT NULL BUF");
        }
        bufs[idx] = data;
        return size * nmemb
      };

      // const entity: Buffer = Buffer.from("mydata");
      // 100Kb
      const entity: Buffer = crypto.randomBytes(100 * 1024);
      let offset = 0;

      // handle.setOpt(Curl.option.VERBOSE, true);
      handle.setOpt(Curl.option.URL, `http://localhost:9999/?num=${startedCount}`);
      handle.setOpt(Curl.option.POST, 1);
      handle.setOpt(Curl.option.WRITEFUNCTION, onData);
      // handle.setOpt(Curl.option.UPLOAD_BUFFERSIZE, 19 * 1024); // 16Kb min, 2MB max
      handle.setOpt(Curl.option.UPLOAD_BUFFERSIZE, 16 * 1024); // 16Kb min, 2MB max
      handle.setOpt(Curl.option.INFILESIZE, entity.length)
      handle.setOpt(Curl.option.HTTPHEADER,
        [
          "Expect:", // need this to disable Expect: 100-continue
          "Content-Type: application/octet-stream",
          `Content-Length: ${entity.length}`, // need this (or chunked)
          // `Transfer-Encoding: chunked`, // need this (or content-length)
        ]
      );
      handle.setOpt(Curl.option.READFUNCTION, (data, size, nmemb) => {

        // console.log("data.length=" + data.length);

        const amountToRead = size * nmemb;

        // console.log("amountToRead=" + amountToRead + " offset=" + offset);

        const count = entity.copy(data, 0, offset, amountToRead + offset);
        offset += count;

        // console.log("<<< copied " + count);

        if (count === 0) {
          // console.log("<<< done copying");
        }

        return count;
      });

      // handle.setOpt("READFUNCTION", 

      multi.addHandle(handle);

      startedCount++;

      startRequest();

    };

    startRequest();

  });
};

const run = async () => {
  startWebserver();

  for (let i = 0; i < RUN_COUNT; i++) {
    const missingCount = await runRequests();
    if (missingCount > 0) {
      console.log(new Date().toISOString() + "- !!! missing count=" + missingCount);
    }
  }

  console.log(new Date().toISOString() + "- done waiting");

  stopWebserver();
};

run();
