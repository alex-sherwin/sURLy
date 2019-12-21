// third party
import React, { FC } from "react";
import { AppContainer as HotLoadingAppContainer } from "react-hot-loader";
import { MemoryRouter } from "react-router";
import { ThemeProvider as MuiThemeProvider } from "@material-ui/styles";

// local
import { StyledComponentsThemeProvider, muiTheme, customTheme, GlobalStyles } from "../theme";
import { ShowcasePage } from "../pages/Showcase";

export const App: FC = () => {

  return (
    <ThirdPartyHoCs>
      <ShowcasePage />
    </ThirdPartyHoCs>
  );
};

const ThirdPartyHoCs: FC = ({ children }) => {
  return (
    <HotLoadingAppContainer>
      <MuiThemeProvider theme={muiTheme}>
        <StyledComponentsThemeProvider theme={customTheme}>
          <MemoryRouter>
            <>
              <GlobalStyles />
              {children}
            </>
          </MemoryRouter>
        </StyledComponentsThemeProvider>
      </MuiThemeProvider>
    </HotLoadingAppContainer>
  );
};
