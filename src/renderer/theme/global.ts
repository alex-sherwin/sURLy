// local
import { createGlobalStyle } from "./styledcomponents";

export const GlobalStyles = createGlobalStyle`
  html {
    font-family: ${p => p.theme.fontFamily};
    font-size: ${p => p.theme.fontSize};
  }
  html, body {
    overflow: hidden;
  }
  body {
    background-color: #222224;
    color: #0aff4b;
  }
  .approot {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
`;
