// third party
import * as React from "react";
import * as ReactDOM from "react-dom";

// local
import { App } from "./app";

// create main element
const mainElement = document.createElement("div");
mainElement.className = "approot";
document.body.appendChild(mainElement);

ReactDOM.render(<App />, mainElement);
