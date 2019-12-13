// third party
import "normalize.css";
import { AppContainer } from "react-hot-loader";
import * as React from "react";
import * as ReactDOM from "react-dom";

// local

// create main element
const mainElement = document.createElement("div");
document.body.appendChild(mainElement);

ReactDOM.render(
  <AppContainer>
    <div>hello world 7</div>
  </AppContainer>,
  mainElement
);
