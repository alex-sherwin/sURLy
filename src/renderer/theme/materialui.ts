// third party
import { createMuiTheme } from "@material-ui/core/styles";

// local
import { customTheme } from "./custom";

export const muiTheme = createMuiTheme({
  typography: {},
  palette: {
    error: {
      main: customTheme.errorColor,
    },
    primary: {
      main: customTheme.primaryColor,
    },
    secondary: {
      main: customTheme.secondaryColor,
    },
    text: {
      secondary: customTheme.secondaryTextColor,
    },
  },
  shape: {
    borderRadius: 0,
  },
});
