import { IconButton, makeStyles, Paper } from "@material-ui/core";
import {
    AccountBalanceTwoTone,
    BrightnessHighTwoTone,
    CameraTwoTone,
    InsertChartTwoTone,
    ListTwoTone,
    PaymentTwoTone,
    ShoppingCartTwoTone,
    TrendingUpTwoTone,
} from "@material-ui/icons";
import chroma from "chroma-js";
import clsx from "clsx";
import { get } from "lodash-es";
import React from "react";
import { useSelector } from "react-redux";
import { TopHatState } from "../../state";
import { OpenPageCache } from "../../state/app/actions";
import { PageStateType } from "../../state/app/types";
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

export const NavBar: React.FC = () => {
    const page = useSelector((state: TopHatState) => state.app.page.id);
    const classes = useStyles();

    const getTab = (id: PageStateType["id"], Icon: IconType, logo: boolean = false) => {
        const selected = id === page;
        const { main } = get(AppColours, id, { light: Greys[700], main: Greys[800], dark: Greys[900] });

        return (
            <IconButton
                className={clsx(classes.button, selected && classes.selected)}
                style={{
                    stroke: logo ? WHITE : undefined,
                    color: selected
                        ? chroma(WHITE)
                              .alpha(logo ? 0.5 : 1)
                              .hex()
                        : main,
                    background: chroma(main)
                        .alpha(selected ? 1 : 0.1)
                        .hex(),
                    // borderColor: selected ? dark : light,
                }}
                onClick={OpenPageCache[id]}
            >
                <Icon style={{ fontSize: logo ? "2.1875rem" : "1.7rem" }} />
            </IconButton>
        );
    };

    return (
        <Paper elevation={3} className={classes.navbar}>
            <div className={classes.logo}>{getTab("summary", CameraTwoTone, true)}</div>
            <div className={classes.apps}>
                {getTab("accounts", AccountBalanceTwoTone)}
                {getTab("transactions", PaymentTwoTone)}
                {getTab("categories", ShoppingCartTwoTone)}
                {getTab("analysis", InsertChartTwoTone)}
                {getTab("forecasts", TrendingUpTwoTone)}
            </div>
            <div className={classes.admin}>
                {getTab("data", ListTwoTone)}
                {getTab("settings", BrightnessHighTwoTone)}
            </div>
        </Paper>
    );
};
