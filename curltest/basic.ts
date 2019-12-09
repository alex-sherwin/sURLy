import http from "http";
import { Curl } from "@capecodes/node-libcurl";

let webserver: http.Server | undefined;

const startWebserver = () => {
  webserver = http.createServer((req, res) => {
    res.statusCode = 200;
    res.end("pong");
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


const run = async () => {
  startWebserver();
  const promises: Promise<any>[] = [];
  for (let i = 0; i < 25; i++) {
    promises.push(doGet("http://localhost:9999/", i + 1));
  }

  await Promise.all(promises);

  console.log("done waiting");

  stopWebserver();
};

const doGet = (url: string, num: number): Promise<void> => {
  return new Promise((resolve, reject) => {

    const handle = new Curl();

    // Just like before, we can use the option name, or the constant
    handle.setOpt(Curl.option.URL, url)

    let bufs: Buffer[] = [];

    // handle.setOpt(Curl.option.VERBOSE, url)

    // This is used to receive the headers
    // See https://curl.haxx.se/libcurl/c/CURLOPT_HEADERFUNCTION.html

    // handle.setOpt(Curl.option.HEADERFUNCTION, (buf: Buffer, size: number, nmemb: number) => {
    //   // console.log(num + " - " + new Date().toISOString() + " - header: " + buf.toString("utf8"));

    //   return size * nmemb
    // });

    // This is used to receive the response data
    // See https://curl.haxx.se/libcurl/c/CURLOPT_WRITEFUNCTION.html
    handle.setOpt(Curl.option.WRITEFUNCTION, (buf: Buffer, size: number, nmemb: number) => {
      // console.log('got data');

      bufs.push(Buffer.from(buf));

      return size * nmemb;
    });


    handle.on("end", (status: any, data: Buffer | string, headers: any, instance: any) => {
      // data will be a 0 length string since we have a Curl.option.WRITEFUNCTION opt set
      instance.close();
      console.log(new Date().toISOString() + " - finished request " + num);
      return resolve();
    });

    handle.on("error", (err: any, code: any, instance: any) => {
      instance.close();
      console.log("error");
      return reject(new Error("curl failed: " + err));
    });

    console.log(new Date().toISOString() + " - starting request " + num);
    handle.perform();

  });
};

run();
