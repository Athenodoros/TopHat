import { unstable_createMuiStrictModeTheme as createMuiTheme } from "@mui/material";
import { Greys, Intents } from "./colours";

export const theme = createMuiTheme({
    palette: {
        background: {
            default: Greys[100],
        },
        primary: {
            main: Intents.primary.main,
        },
        success: {
            main: Intents.success.main,
        },
        warning: {
            main: Intents.warning.main,
        },
        error: {
            main: Intents.danger.main,
        },
    },
});
