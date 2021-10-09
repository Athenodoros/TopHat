import { Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import chroma from "chroma-js";
import React from "react";
import { IconType } from "../../shared/types";
import { Intents } from "../../styles/colours";

const useStyles = makeStyles({
    container: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        margin: "auto",
        padding: 40,
    },
    icon: {
        margin: 10,
        height: 50,
        width: 50,
    },
    subtitle: {
        opacity: 0.8,
        maxWidth: 300,
        textAlign: "center",
        margin: "5px 0 10px 0",
    },
    padding: { flexGrow: 1 },
});

interface NonIdealStateProps {
    icon: IconType;
    title: string;
    intent?: keyof typeof Intents;
    subtitle?: string;
    action?: React.ReactNode;
}
export const NonIdealState: React.FC<NonIdealStateProps> = ({ icon: Icon, title, subtitle, intent, action }) => {
    const classes = useStyles();

    return (
        <div className={classes.container}>
            <Icon
                htmlColor={chroma(Intents[intent || "default"].light)
                    .alpha(0.5)
                    .hex()}
                className={classes.icon}
            />
            <Typography variant="h6">{title}</Typography>
            {subtitle ? (
                <Typography variant="body2" className={classes.subtitle}>
                    {subtitle}
                </Typography>
            ) : undefined}
            {action}
        </div>
    );
};
