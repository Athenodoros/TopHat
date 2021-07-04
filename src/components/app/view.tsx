import { makeStyles } from "@material-ui/core";
import React from "react";
import { useSelector } from "react-redux";
import { SummaryPage } from "../../screens/summary";
import { TopHatState } from "../../state";
import { NavBar } from "./navbar";

const useStyles = makeStyles((theme) => ({
    app: {
        height: "100vh",
        width: "100vw",
        display: "flex",
        backgroundColor: theme.palette.background.default,
        "& *:focus": {
            outline: "none",
        },
    },
}));

export const View: React.FC = () => {
    const page = useSelector((state: TopHatState) => state.app.page.id);
    const classes = useStyles();

    return (
        <div className={classes.app}>
            <NavBar />
            {page === "summary" ? <SummaryPage /> : undefined}
        </div>
    );
};
