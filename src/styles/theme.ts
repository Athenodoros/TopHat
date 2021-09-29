import { Theme, unstable_createMuiStrictModeTheme as createMuiTheme } from "@mui/material";
import { Greys, Intents } from "./colours";

// declare module "@mui/material/styles" {
//     interface Palette {
//         neutral: Palette["primary"];
//     }
//     interface PaletteOptions {
//         neutral: PaletteOptions["primary"];
//     }
// }

// This is necessary to ensure that the DefaultTheme used by typescript fully inherits everything from Theme
declare module "@mui/styles/defaultTheme" {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface DefaultTheme extends Theme {}
}

export const theme = createMuiTheme({
    components: {
        MuiButton: {
            variants: [
                {
                    props: { variant: "outlined", color: "inherit" },
                    style: {
                        borderColor: `rgba(0, 0, 0, 0.23)`,
                    },
                },
            ],
        },
    },
    palette: {
        background: {
            default: Greys[100],
        },
        primary: {
            main: Intents.primary.main,
        },
        secondary: {
            main: Intents.danger.main,
        },
        // neutral: {
        //     main: Greys[700],
        // },
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
