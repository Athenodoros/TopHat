import styled from "@emotion/styled";
import React from "react";
import { AccountPage } from "../pages/account";
import { AccountsPage } from "../pages/accounts";
import { CategoriesPage } from "../pages/categories";
import { CategoryPage } from "../pages/category";
import { ForecastPage } from "../pages/forecasts";
import { SummaryPage } from "../pages/summary";
import { TransactionsPage } from "../pages/transactions";
import { PageStateType } from "../state/app/pageTypes";
import { useSelector } from "../state/shared/hooks";
import { APP_BACKGROUND_COLOUR } from "../styles/theme";
import { NavBar } from "./navbar";

export const View: React.FC = () => {
    const page = useSelector((state) => state.app.page.id);

    return (
        <AppContainerBox>
            <NavBar />
            {Pages[page]}
        </AppContainerBox>
    );
};

const Pages: Record<PageStateType["id"], JSX.Element> = {
    summary: <SummaryPage />,
    accounts: <AccountsPage />,
    account: <AccountPage />,
    transactions: <TransactionsPage />,
    categories: <CategoriesPage />,
    category: <CategoryPage />,
    forecasts: <ForecastPage />,
};

const AppContainerBox = styled("div")({
    height: "100vh",
    width: "100vw",
    display: "flex",
    backgroundColor: APP_BACKGROUND_COLOUR,
    "& *:focus": { outline: "none" },
});
