import makeStyles from "@mui/styles/makeStyles";
import React from "react";
import { SECTION_MARGIN } from "../layout";

export * from "./bar";
export * from "./breakdown";
export * from "./data";

const useStyles = makeStyles({
    container: {
        display: "flex",

        "& > div:first-of-type": {
            flex: "300px 0 0",
            marginRight: SECTION_MARGIN,
        },

        "& > div:last-child": {
            flexGrow: 1,
        },
    },
});

export const SummarySection: React.FC = ({ children }) => {
    const classes = useStyles();

    return <div className={classes.container}>{children}</div>;
};
