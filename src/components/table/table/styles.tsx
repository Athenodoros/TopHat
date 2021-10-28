import styled from "@emotion/styled";
import { buttonClasses, Typography } from "@mui/material";
import { Box } from "@mui/system";
import numeral from "numeral";
import { Greys } from "../../../styles/colours";
import { getThemeTransition, TopHatTheme } from "../../../styles/theme";

const DEFAULT_ROW_HEIGHT = 50;
const CENTERED_CONTAINER = {
    height: DEFAULT_ROW_HEIGHT,
    display: "flex",
    alignItems: "center",
};
const BASE_PLACEHOLDER = {
    opacity: 1,
    color: Greys[500],
    overflow: "visible",
    fontWeight: 300,
};
const MIXED_PLACEHOLDER = {
    ...BASE_PLACEHOLDER,
    fontStyle: "italic",
};

export const TransactionTableDateContainer = styled(Box)({
    ...CENTERED_CONTAINER,
    width: 90,
    marginLeft: 10,
    marginRight: 10,
    flexGrow: 1,
});
export const TransactionTableTextContainer = styled(Box)({ width: 150, flexGrow: 4, margin: "14px 10px 10px 0" });
export const TransactionTableValueContainer = styled(Box)({
    ...CENTERED_CONTAINER,
    width: 110,
    marginRight: 20,
    flexGrow: 1,
    justifyContent: "flex-end",
});
export const TransactionTableCategoryContainer = styled(Box)({
    ...CENTERED_CONTAINER,
    width: 150,
    flexGrow: 2,
});
export const TransactionTableBalanceContainer = styled(Box)({
    ...CENTERED_CONTAINER,
    width: 110,
    marginLeft: 10,
    flexGrow: 1,
    justifyContent: "flex-end",
});
export const TransactionTableStatementContainer = styled(Box)({
    ...CENTERED_CONTAINER,
    margin: "0 15px",

    "& > svg": {
        margin: 3,
    },

    "& button": {
        minWidth: "auto",
        padding: 2,

        [`& .${buttonClasses.endIcon}`]: {
            margin: 0,
        },
    },
});
export const TransactionTableAccountContainer = styled(Box)({
    ...CENTERED_CONTAINER,
    width: 170,
    flexGrow: 1,
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
});
export const TransactionTableActionsContainer = styled(Box)({
    ...CENTERED_CONTAINER,
    width: 100,
    flexGrow: 0,
    padding: "0 5px",
    justifyContent: "flex-end",

    "& button": { padding: 3 },
    "& > *": {
        marginLeft: 5,
    },
});
export const TransactionTableCompoundContainer = styled(Box)({
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
    whiteSpace: "nowrap",
    height: 32,
});

export const TransactionsTableSummaryTypography = styled(Typography)({ fontWeight: 500 });
export const TransactionTableMixedTypography = styled(Typography)(MIXED_PLACEHOLDER);

export const TransactionTableSxProps = {
    Container: {
        display: "flex",
        alignItems: "flex-start !important",
        padding: "0 5px",
        height: "min-content !important",
        ...TopHatTheme.typography.body1,
        transition: getThemeTransition(["box-shadow"]),

        "& > *": { flexShrink: 0 },

        borderBottom: "1px solid " + Greys[200],
        "&:last-child": {
            borderBottomColor: "transparent",
        },

        "& p": {
            lineHeight: "1 !important",
            padding: "3px 0",
        },
    },
    Mixed: MIXED_PLACEHOLDER,
    BasePlaceholder: { "&::placeholder": BASE_PLACEHOLDER },
    MixedPlaceholder: { "& input::placeholder": MIXED_PLACEHOLDER },
    CenteredValueContainer: CENTERED_CONTAINER,
    MissingValue: {
        fontStyle: "italic",
        color: Greys[500],
        overflow: "visible",
    },
};

export const formatTransactionsTableNumber = (value: number) => numeral(value).format("0,0.00");
