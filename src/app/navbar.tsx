import styled from "@emotion/styled";
import {
    AccountBalanceWalletTwoTone,
    Camera,
    PaymentTwoTone,
    SettingsTwoTone,
    ShoppingBasketTwoTone,
    TrendingUpTwoTone,
} from "@mui/icons-material";
import { IconButton, Paper, useTheme } from "@mui/material";
import { Box } from "@mui/system";
import chroma from "chroma-js";
import { mapValues } from "lodash-es";
import React from "react";
import { IconType } from "../shared/types";
import { TopHatDispatch } from "../state";
import { AppSlice, DefaultPages } from "../state/app";
import { OpenPageCache } from "../state/app/actions";
import { PageStateType } from "../state/app/pageTypes";
import { useSelector } from "../state/shared/hooks";
import { AppColours, Greys, WHITE } from "../styles/colours";

export const NAVBAR_LOGO_HEIGHT = 156;

const SelectionEquivalents = {
    ...mapValues(DefaultPages, (page) => page.id as "summary"),
    account: "accounts" as const,
    category: "categories" as const,
};

export const NavBar: React.FC = () => {
    const page = useSelector((state) => state.app.page.id);
    const theme = useTheme();

    const getIcon = (
        colour: string,
        Icon: IconType,
        onClick: (event: React.MouseEvent<HTMLButtonElement>) => void,
        selected?: boolean,
        logo?: boolean
    ) => (
        <AppIconButton
            sx={{
                transition: theme.transitions.create("all"),
                color: selected ? WHITE : colour,
                background: selected ? colour : chroma(colour).alpha(0.1).hex(),
                "&:hover": {
                    backgroundColor: selected ? chroma(colour).darken(1).hex() : chroma(colour).alpha(0.2).hex(),
                    "& > svg": {
                        transform: "scale(0.9)",
                    },
                },
            }}
            onClick={onClick}
            size="large"
        >
            <Icon
                sx={{
                    fontSize: logo ? "2rem" : "1.7rem",
                    transformOrigin: "center",
                    transition: theme.transitions.create("all"),
                }}
            />
        </AppIconButton>
    );
    const getTab = (id: PageStateType["id"], Icon: IconType, logo: boolean = false) => {
        const selected = SelectionEquivalents[page] === id;
        const { main } = AppColours[SelectionEquivalents[id]];

        return getIcon(main, Icon, OpenPageCache[id], selected, logo);
    };

    return (
        <NavBarContainerPaper>
            <SummaryContainerBox>{getTab("summary", Camera, true)}</SummaryContainerBox>
            <AppContainerBox>
                {getTab("accounts", AccountBalanceWalletTwoTone)}
                {getTab("transactions", PaymentTwoTone)}
                {getTab("categories", ShoppingBasketTwoTone)}
                {getTab("forecasts", TrendingUpTwoTone)}
            </AppContainerBox>
            <SettingsContainerBox>{getIcon(Greys[800], SettingsTwoTone, openSettingsDialog)}</SettingsContainerBox>
        </NavBarContainerPaper>
    );
};

const openSettingsDialog = () => TopHatDispatch(AppSlice.actions.setDialogPage("settings"));

const AppIconButton = styled(IconButton)({
    width: 46,
    height: 46,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    // border: "1px solid",
    borderRadius: 10,
    marginBottom: 27,
    flexShrink: 0,
});
const NavBarContainerPaper = styled(Paper)({
    flex: "80px 0 0",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",

    "& > div": {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",

        "& > div": {
            cursor: "pointer",
        },
    },
});
const SummaryContainerBox = styled(Box)({
    height: NAVBAR_LOGO_HEIGHT,
    justifyContent: "center",
    flexShrink: 0,

    "& > button": {
        margin: 0,
        borderRadius: "50%",
        width: 52,
        height: 52,

        svg: {
            strokeWidth: 1,
        },
    },
});
const AppContainerBox = styled(Box)({
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
    overflowY: "auto",
});
const SettingsContainerBox = styled(Box)({
    flexShrink: 0,
    background: WHITE,
    paddingTop: 27,
    "& > *:last-child": { marginBottom: 13 },
});
