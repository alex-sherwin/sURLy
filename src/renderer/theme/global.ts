// local
import { createGlobalStyle } from "./styledcomponents";

export const GlobalStyles = createGlobalStyle`
  html {
    font-family: ${p => p.theme.fontFamily};
    font-size: ${p => p.theme.fontSize};
  }
`;
