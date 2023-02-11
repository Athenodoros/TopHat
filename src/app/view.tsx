import styled from "@emotion/styled";
import React, { useEffect } from "react";
import { AccountPage } from "../pages/account";
import { AccountsPage } from "../pages/accounts";
import { CategoriesPage } from "../pages/categories";
import { CategoryPage } from "../pages/category";
import { ForecastPage } from "../pages/forecasts";
import { SummaryPage } from "../pages/summary";
import { TransactionsPage } from "../pages/transactions";
import { TopHatDispatch } from "../state";
import { PageStateType } from "../state/app/pageTypes";
import { DataSlice, setSubmitNotification } from "../state/data";
import { useSelector } from "../state/shared/hooks";
import { APP_BACKGROUND_COLOUR } from "../styles/theme";
import { NavBar } from "./navbar";
import { useSetAlert } from "./popups";
import { MIN_WIDTH_FOR_APPLICATION } from "./tutorial";

export const View: React.FC = () => {
    const page = useSelector((state) => state.app.page.id);
    const setAlert = useSetAlert();
    useEffect(
        () =>
            setSubmitNotification((data, message, intent) =>
                setAlert({
                    message,
                    severity: intent || "success",
                    action: {
                        name: "UNDO",
                        callback: () => TopHatDispatch(DataSlice.actions.set(data)),
                    },
                })
            ),
        [setAlert]
    );

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
    minWidth: MIN_WIDTH_FOR_APPLICATION,
    display: "flex",
    backgroundColor: APP_BACKGROUND_COLOUR,
    "& *:focus": { outline: "none" },
});
