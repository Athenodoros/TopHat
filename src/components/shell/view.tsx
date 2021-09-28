import makeStyles from '@mui/styles/makeStyles';
import React from "react";
import { AccountPage } from "../../screens/account";
import { AccountsPage } from "../../screens/accounts";
import { AnalysisPage } from "../../screens/analysis";
import { CategoriesPage } from "../../screens/categories";
import { CategoryPage } from "../../screens/category";
import { ForecastPage } from "../../screens/forecasts";
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
            {page === "account" ? <AccountPage /> : undefined}
            {page === "transactions" ? <TransactionsPage /> : undefined}
            {page === "categories" ? <CategoriesPage /> : undefined}
            {page === "category" ? <CategoryPage /> : undefined}
            {page === "analysis" ? <AnalysisPage /> : undefined}
            {page === "forecasts" ? <ForecastPage /> : undefined}
        </div>
    );
};
