import { unstable_createMuiStrictModeTheme as createMuiTheme } from "@mui/material";
import { AppColours, Greys, Intents } from "./colours";

// declare module "@mui/material/styles" {
//     interface Palette {
//         neutral: Palette["primary"];
//     }
//     interface PaletteOptions {
//         neutral: PaletteOptions["primary"];
//     }
// }

// // This is necessary to ensure that the DefaultTheme used by typescript fully inherits everything from Theme
// declare module "@mui/styles/defaultTheme" {
//     // eslint-disable-next-line @typescript-eslint/no-empty-interface
//     interface DefaultTheme extends Theme {}
// }

export const APP_BACKGROUND_COLOUR = Greys[100];
export const TopHatTheme = createMuiTheme({
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
        app: {
            ...AppColours.summary,
            contrastText: "white",
        },
        background: {
            default: APP_BACKGROUND_COLOUR,
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
    spacing: 1,
    // This messes with the default MUI component styling - better to manage manually
    // shape: {
    //     borderRadius: 1,
    // },
});

export const getThemeTransition = TopHatTheme.transitions.create;

export const DEFAULT_BORDER_RADIUS = 4;

declare module "@mui/material/styles" {
    interface Palette {
        app: Palette["primary"];
    }
    interface PaletteOptions {
        app: PaletteOptions["primary"];
    }
}

declare module "@mui/material/Button" {
    interface ButtonPropsColorOverrides {
        app: true;
    }
}
