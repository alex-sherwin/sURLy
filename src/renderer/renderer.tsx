// third party
import * as React from "react";
import * as ReactDOM from "react-dom";

// local
import { App } from "./app";

// create main element
const mainElement = document.createElement("div");
document.body.appendChild(mainElement);

ReactDOM.render(<App />, mainElement);
