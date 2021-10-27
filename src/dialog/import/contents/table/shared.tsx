import { Greys } from "../../../../styles/colours";

export const DIALOG_IMPORT_TABLE_HEADER_STYLES = {
    background: Greys[200],
    borderBottom: "2px solid " + Greys[400],

    position: "sticky",
    top: 0,
    zIndex: 2,
} as const;

export const DIALOG_IMPORT_TABLE_ROW_STYLES = {
    borderTop: "1px solid " + Greys[300],
} as const;

export const DIALOG_IMPORT_TABLE_ICON_BUTTON_STYLES = {
    padding: 0,

    "& .MuiButton-endIcon": {
        marginLeft: "-1px !important",
    },
} as const;
