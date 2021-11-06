import styled from "@emotion/styled";
import { Clear } from "@mui/icons-material";
import { Button, IconButton } from "@mui/material";
import { Box } from "@mui/system";
import { useSnackbar } from "notistack";
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

export const View: React.FC = () => {
    const page = useSelector((state) => state.app.page.id);
    const { enqueueSnackbar, closeSnackbar } = useSnackbar();
    useEffect(
        () =>
            setSubmitNotification((data, message, intent) =>
                enqueueSnackbar(message, {
                    variant: intent || "success",
                    action: (key) => (
                        <Box>
                            <Button
                                color="white"
                                onClick={() => {
                                    TopHatDispatch(DataSlice.actions.set(data));
                                    closeSnackbar(key);
                                }}
                            >
                                Undo
                            </Button>
                            <IconButton color="white" onClick={() => closeSnackbar(key)}>
                                <Clear fontSize="small" />
                            </IconButton>
                        </Box>
                    ),
                })
            ),
        [enqueueSnackbar, closeSnackbar]
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
    display: "flex",
    backgroundColor: APP_BACKGROUND_COLOUR,
    "& *:focus": { outline: "none" },
});
