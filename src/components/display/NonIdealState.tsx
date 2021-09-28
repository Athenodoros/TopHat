import { Typography } from "@mui/material";
import makeStyles from '@mui/styles/makeStyles';
import React from "react";
import { Greys } from "../../styles/colours";
import { IconType } from "../../utilities/types";

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
    subtitle: string;
    action?: React.ReactNode;
}
export const NonIdealState: React.FC<NonIdealStateProps> = ({ icon: Icon, title, subtitle, action }) => {
    const classes = useStyles();

    return (
        <div className={classes.container}>
            <Icon htmlColor={Greys[400]} className={classes.icon} />
            <Typography variant="h6">{title}</Typography>
            <Typography variant="body2" className={classes.subtitle}>
                {subtitle}
            </Typography>
            {action}
        </div>
    );
};
