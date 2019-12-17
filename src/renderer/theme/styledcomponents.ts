// third party
import * as styledComponents from "styled-components";
import { ThemedStyledComponentsModule } from "styled-components";

// local
import { customTheme } from "./custom";

const {
  default: styled,
  createGlobalStyle,
  css,
  keyframes,
  ThemeProvider,
} = styledComponents as ThemedStyledComponentsModule<typeof customTheme>;

// export styled-component functions and objects with theme typing applied
export { css, createGlobalStyle, keyframes, ThemeProvider, styled };
