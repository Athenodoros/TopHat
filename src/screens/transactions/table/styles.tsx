import { makeStyles } from "@material-ui/core";
import chroma from "chroma-js";
import numeral from "numeral";
import { Greys } from "../../../styles/colours";

const DEFAULT_ROW_HEIGHT = 50;
const CENTERED_CONTAINER = {
    height: DEFAULT_ROW_HEIGHT,
    display: "flex",
    alignItems: "center",
};

export const useTransactionsTableStyles = makeStyles((theme) => ({
    // Overall container layout
    container: {
        display: "flex",
        alignItems: "flex-start",
        padding: "0 5px",
        ...theme.typography.body1,

        borderBottom: "1px solid " + Greys[200],
        "&:last-child": {
            borderBottomColor: "transparent",
        },

        "& p": {
            lineHeight: "1 !important",
        },
    },
    headerContainer: {},
    rowContainer: {
        "& > div:last-child": {
            visibility: "hidden",
        },
        "&:hover > div:last-child": {
            visibility: "inherit",
        },
    },

    // Component containers
    checkbox: {
        ...CENTERED_CONTAINER,
    },
    transfer: {
        margin: "0 5px",
        ...CENTERED_CONTAINER,
    },
    date: {
        width: 110,
        marginLeft: 5,
        flexGrow: 1,
        ...CENTERED_CONTAINER,
    },
    text: {
        width: 150,
        flexGrow: 4,
        margin: "17px 10px 10px 0",
    },
    summary: { fontWeight: 500, overflow: "visible" },
    description: {
        marginTop: 5,
        lineHeight: 1.4,
        color: Greys[700],
    },
    value: {
        width: 105,
        marginRight: 20,
        ...CENTERED_CONTAINER,
        justifyContent: "flex-end",
    },
    category: {
        width: 130,
        flexGrow: 1,
        ...CENTERED_CONTAINER,

        "& > div > div > svg": {
            visibility: "hidden",
        },
    },
    categoryIcon: {
        height: 16,
        width: 16,
        borderRadius: "50%",
        marginRight: 6,
        border: "1px solid",
    },
    balance: {
        width: 110,
        marginLeft: 10,
        flexGrow: 1,
        ...CENTERED_CONTAINER,
        justifyContent: "flex-end",
    },
    statement: {
        margin: "0 15px",
        ...CENTERED_CONTAINER,
    },
    account: {
        width: 170,
        flexGrow: 1,
        ...CENTERED_CONTAINER,
    },
    accountIcon: {
        height: 18,
        width: 18,
        borderRadius: 5,
        marginRight: 6,
    },
    actions: {
        width: 100,
        padding: "0 5px",
        ...CENTERED_CONTAINER,
        justifyContent: "flex-end",
    },

    // Utility classes
    compound: {
        display: "flex",
        alignItems: "center",
    },
    subtext: {
        color: Greys[500],
        alignSelf: "flex-end",
        margin: "0 4px",
    },
    missing: {
        fontStyle: "italic",
        color: Greys[500],
    },
}));

export const formatTransactionsTableNumber = (value: number) => numeral(value).format("0,0.00");

const defaultIconStyles = {
    backgroundColor: chroma(Greys[400]).alpha(0.5).hex(),
    borderColor: Greys[400],
};
export const getIconStyles = (colour?: string) =>
    colour
        ? {
              backgroundColor: chroma(colour).alpha(0.5).hex(),
              borderColor: colour,
          }
        : defaultIconStyles;
