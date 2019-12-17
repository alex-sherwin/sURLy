// third party
import "normalize.css";
import { AppContainer } from "react-hot-loader";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { MemoryRouter } from "react-router";

// local

// create main element
const mainElement = document.createElement("div");
document.body.appendChild(mainElement);

ReactDOM.render(
  (
    <AppContainer>
      <MemoryRouter>
        <div>hello world 8</div>
      </MemoryRouter>
    </AppContainer>
  ),
  mainElement
);
