import styled from "@emotion/styled";
import React from "react";
import { AccountPage } from "../pages/account";
import { AccountsPage } from "../pages/accounts";
import { CategoriesPage } from "../pages/categories";
import { CategoryPage } from "../pages/category";
import { ForecastPage } from "../pages/forecasts";
import { SummaryPage } from "../pages/summary";
import { TransactionsPage } from "../pages/transactions";
import { useSelector } from "../state/shared/hooks";
import { APP_BACKGROUND_COLOUR } from "../styles/theme";
import { NavBar } from "./navbar";

export const View: React.FC = () => {
    const page = useSelector((state) => state.app.page.id);

    return (
        <AppContainerBox>
            <NavBar />
            {page === "summary" ? <SummaryPage /> : undefined}
            {page === "accounts" ? <AccountsPage /> : undefined}
            {page === "account" ? <AccountPage /> : undefined}
            {page === "transactions" ? <TransactionsPage /> : undefined}
            {page === "categories" ? <CategoriesPage /> : undefined}
            {page === "category" ? <CategoryPage /> : undefined}
            {page === "forecasts" ? <ForecastPage /> : undefined}
        </AppContainerBox>
    );
};

const AppContainerBox = styled("div")({
    height: "100vh",
    width: "100vw",
    display: "flex",
    backgroundColor: APP_BACKGROUND_COLOUR,
    "& *:focus": { outline: "none" },
});
