import { IconButton, makeStyles, Paper } from "@material-ui/core";
import {
    AccountBalanceWalletTwoTone,
    Camera,
    InsertChartTwoTone,
    ListTwoTone,
    PaymentTwoTone,
    SettingsTwoTone,
    ShoppingBasketTwoTone,
    TrendingUpTwoTone,
} from "@material-ui/icons";
import chroma from "chroma-js";
import clsx from "clsx";
import { get, mapValues } from "lodash-es";
import React from "react";
import { DefaultPages } from "../../state/app";
import { OpenPageCache } from "../../state/app/actions";
import { PageStateType } from "../../state/app/types";
import { useSelector } from "../../state/utilities/hooks";
import { AppColours, Greys, WHITE } from "../../styles/colours";
import { IconType } from "../../utilities/types";

export const NAVBAR_LOGO_HEIGHT = 156;
const useStyles = makeStyles((theme) => ({
    navbar: {
        width: 80,
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
    },

    logo: {
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
    },

    apps: {
        flexGrow: 1,
        flexShrink: 1,
        minHeight: 0,
        overflowY: "scroll",
    },

    admin: {
        flexShrink: 0,
        background: WHITE,
        paddingTop: 27,

        "& > *:last-child": {
            marginBottom: 13,
        },
    },

    button: {
        width: 46,
        height: 46,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: theme.transitions.create("all"),
        // border: "1px solid",
        borderRadius: 10,
        marginBottom: 27,
        flexShrink: 0,
    },
    selected: {
        borderWidth: 3,
    },
}));

const SelectionEquivalents = {
    ...mapValues(DefaultPages, (page) => page.id),
    account: "accounts",
};

export const NavBar: React.FC = () => {
    const page = useSelector((state) => state.app.page.id);
    const classes = useStyles();

    const getTab = (id: PageStateType["id"], Icon: IconType, logo: boolean = false) => {
        const selected = SelectionEquivalents[page] === id;
        const { main } = get(AppColours, id, { light: Greys[700], main: Greys[800], dark: Greys[900] });

        return (
            <IconButton
                className={clsx(classes.button, selected && classes.selected)}
                style={{
                    // stroke: logo ? WHITE : undefined,
                    color: selected ? WHITE : main,
                    background: chroma(main)
                        .alpha(selected ? 1 : 0.1)
                        .hex(),
                    // borderColor: selected ? dark : light,
                }}
                onClick={OpenPageCache[id]}
            >
                <Icon style={{ fontSize: logo ? "2rem" : "1.7rem" }} />
            </IconButton>
        );
    };

    return (
        <Paper elevation={3} className={classes.navbar}>
            <div className={classes.logo}>{getTab("summary", Camera, true)}</div>
            <div className={classes.apps}>
                {getTab("accounts", AccountBalanceWalletTwoTone)}
                {getTab("transactions", PaymentTwoTone)}
                {getTab("categories", ShoppingBasketTwoTone)}
                {getTab("analysis", InsertChartTwoTone)}
                {getTab("forecasts", TrendingUpTwoTone)}
            </div>
            <div className={classes.admin}>
                {getTab("data", ListTwoTone)}
                {getTab("settings", SettingsTwoTone)}
            </div>
        </Paper>
    );
};
