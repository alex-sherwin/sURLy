// tslint:disable-next-line:no-var-requires
require("source-map-support").install();

import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import * as url from 'url';
import _trimStart from "lodash/trimStart";

import { CurlClient, ExecuteResult } from './curl';
import { log } from './log';

let win: BrowserWindow | null;

const x = _trimStart("  asfa ");

// console.log(process.versions);

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];

  return Promise.all(
    extensions.map(name => installer.default(installer[name], forceDownload))
  ).catch(console.log);
};

const createWindow = async () => {
  if (process.env.NODE_ENV !== 'production') {
    await installExtensions();
  }

  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      plugins: false,
      webSecurity: false,
    },
  });

  if (process.env.NODE_ENV !== 'production') {
    process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = '1';
    win.loadURL(`http://localhost:2003`);
  } else {
    win.loadURL(
      url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
      })
    );
  }

  if (process.env.NODE_ENV !== 'production') {
    // Open DevTools, see https://github.com/electron/electron/issues/12438 for why we wait for dom-ready
    win.webContents.once('dom-ready', () => {
      // win!.webContents.openDevTools();
    });
  }

  win.on('closed', () => {
    win = null;
  });
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (win === null) {
    createWindow();
  }
});

const run = async () => {
  for (let i = 0; i < 10; i++) {
    await run2();
  }
};

const run2 = async () => {
  // const webserver1 = await startWebserver(9990);
  const holder = {
    client: new CurlClient({
      maxConnectionsPerHost: 4,
    })
  };

  try {

    // log.error("before 1");

    // let responseEntity = fs.createWriteStream("/Users/asherwin/Desktop/out", {
    //   highWaterMark: 128 * 1024,
    // });

    const p1 = await doGET(holder.client);

    // log.error("after 1 wait");

    // responseEntity = fs.createWriteStream("/Users/asherwin/Desktop/out", {
    //   highWaterMark: 128 * 1024,
    // });


    const promises: Promise<ExecuteResult>[] = [];

    // log.error("before bulk");
    for (let i = 0; i < 10; i++) {
      promises.push(doGET(holder.client));
    }

    const results = await Promise.all(promises);
    // log.error("after bulk");

    // console.log(JSON.stringify(results[95], null, 2));

    let z = 0;
    for (const result of results) {

      if (z++ % 50 === 0) {

        const elapsedInitMillis = (result.timing.endNano - result.timing.initNano) / 1000000;
        const elapsedRequestMillis = (result.timing.endNano - result.timing.connectedNano) / 1000000;
        console.log(`${new Date().toISOString()} - elapsed total=${elapsedInitMillis}ms request=${elapsedRequestMillis}`);
      }
    }

  } catch (e) {
    console.log(e);
  } finally {
    // log.debug("closing curl client");
    holder.client.close();
    delete holder.client;
  }
  // console.log(new Date().toISOString() + "- done waiting");
  // stopWebserver(webserver1);
};

const doGET = (client: CurlClient): Promise<ExecuteResult> => {
  return client.execute({
    method: "GET",
    url: `http://localhost:9990/post`,
    headers: {
      "x-status-code": "418",
      "x-response-type": "random",
      "x-max-random-response-bytes": "12",
      // [Headers.X_RESPONSE_DELAY_MILLIS]: "5",
    },
    requestEntity: Buffer.from("boo"),
  });

};

// setInterval(() => {
//   log.warn(` interval thingy `);
// }, 1000);

// run();


// run main modules

// import "./smtpserver";
// import "./mailsender";
// import "./config";
// import "./generators/ipc";

