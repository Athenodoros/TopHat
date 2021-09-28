import { lighten } from "@mui/material";
import makeStyles from '@mui/styles/makeStyles';
import clsx from "clsx";
import React from "react";
import { Greys } from "../../styles/colours";
import { BasicChartDomainFunctions, getBasicBarChartColour } from "./BasicBarChart";

const useStyles = makeStyles((theme) => ({
    container: {
        position: "relative",
        width: "100%",
        height: "100%",
        "& > *": {
            position: "absolute",
        },
    },
    outline: {
        top: "20%",
        width: "100%",
        height: "60%",
        border: "1px solid " + Greys[800],
        borderRadius: 12,
        overflow: "hidden",
    },
    minimal: {
        borderColor: "transparent",
        background: Greys[200],
    },
    filler: {
        position: "absolute",
        transition: theme.transitions.create("all"),
        height: "100%",
        opacity: 0.6,
    },
    minimalFiller: {
        opacity: 1,
    },
    cumulative: {
        opacity: 0.2,
    },
    minimalCumulative: {
        opacity: 0.4,
    },
    zero: {
        position: "absolute",
        transition: theme.transitions.create("all"),
        width: 1,
        height: "100%",
        marginRight: -0.5,
        background: Greys[500],
    },
    value: {
        transition: theme.transitions.create("all"),
        width: 4,
        height: "100%",
        marginRight: -2,
    },
    secondary: {
        transition: theme.transitions.create("all"),
        top: "5%",
        width: 1.5,
        height: "90%",
        background: Greys[600],
        marginRight: -0.75,
    },
}));

interface BasicFillbarProps {
    range: [number, number, number];
    showEndpoint?: boolean;
    minimal?: boolean;
    secondary?: number;
    functions: BasicChartDomainFunctions;
    success: boolean | null;
}
export const BasicFillbar: React.FC<BasicFillbarProps> = ({
    range,
    showEndpoint,
    minimal,
    secondary,
    functions,
    success,
}) => {
    const classes = useStyles();

    const colour = getBasicBarChartColour(success, range[0] === range[2]);

    const main = functions.getOffsetAndSizeForRange(range[2], range[1]);
    const faded = functions.getOffsetAndSizeForRange(range[1], range[0]);

    return (
        <div className={classes.container}>
            <div className={clsx(classes.outline, minimal && classes.minimal)}>
                {range[2] !== range[1] || range[1] === range[0] ? (
                    <div
                        className={clsx(classes.filler, minimal && classes.minimalFiller)}
                        style={{
                            borderRight: "1px solid " + colour.main,
                            borderLeft: "1px solid " + colour.main,
                            background: lighten(colour.main, 0.4),
                            right: main.offset,
                            width: main.size,
                        }}
                    />
                ) : undefined}
                <div
                    className={clsx(classes.filler, minimal ? classes.minimalCumulative : classes.cumulative)}
                    style={{
                        background: lighten(colour.main, 0.4),
                        right: faded.offset,
                        width: faded.size,
                    }}
                />
                {["100%", "0%"].includes(functions.getPoint(0)) ? undefined : (
                    <div className={classes.zero} style={{ right: functions.getPoint(0) }} />
                )}
            </div>
            {showEndpoint ? (
                <div
                    className={classes.value}
                    style={{
                        background: colour.main,
                        right: functions.getPoint(range[2]),
                    }}
                />
            ) : undefined}
            {secondary !== undefined ? (
                <div
                    className={classes.secondary}
                    style={{
                        right: functions.getPoint(secondary),
                    }}
                />
            ) : undefined}
        </div>
    );
};
