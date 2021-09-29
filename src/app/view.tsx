import makeStyles from "@mui/styles/makeStyles";
import React from "react";
import { AccountPage } from "../pages/account";
import { AccountsPage } from "../pages/accounts";
import { AnalysisPage } from "../pages/analysis";
import { CategoriesPage } from "../pages/categories";
import { CategoryPage } from "../pages/category";
import { ForecastPage } from "../pages/forecasts";
import { SummaryPage } from "../pages/summary";
import { TransactionsPage } from "../pages/transactions";
import { useSelector } from "../state/shared/hooks";
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
