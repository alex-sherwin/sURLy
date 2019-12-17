// third party
import React, { FC } from "react";
import { AppContainer as HotLoadingAppContainer } from "react-hot-loader";
import { MemoryRouter } from "react-router";
import { ThemeProvider as MuiThemeProvider } from "@material-ui/styles";
import Button from "@material-ui/core/Button";

// local
import { styled, StyledComponentsThemeProvider, muiTheme, customTheme, GlobalStyles } from "../theme";

const MyButton = styled(Button)`
`;


export const App: FC = () => {
  return (
    <ThirdPartyHoCs>
      <div><MyButton variant="outlined" color="primary">Hi</MyButton></div>
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
