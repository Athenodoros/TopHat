import { makeStyles } from "@material-ui/core";
import React from "react";
import { AccountsPage } from "../../screens/accounts";
import { SummaryPage } from "../../screens/summary";
import { TransactionsPage } from "../../screens/transactions";
import { useSelector } from "../../state/utilities/hooks";
import { NavBar } from "./navbar";

const useViewStyles = makeStyles((theme) => ({
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
    const page = useSelector((state) => state.app.page.id);
    const classes = useViewStyles();

    return (
        <div className={classes.app}>
            <NavBar />
            {page === "summary" ? <SummaryPage /> : undefined}
            {page === "accounts" ? <AccountsPage /> : undefined}
            {page === "transactions" ? <TransactionsPage /> : undefined}
        </div>
    );
};
