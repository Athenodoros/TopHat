import { Card } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { SxProps } from "@mui/system";
import React from "react";

const useStyles = makeStyles((theme) => ({
    container: {
        top: 0,
        position: "sticky",
        backgroundColor: theme.palette.background.default,
        zIndex: 1,
        margin: "-20px -10px 5px -10px",
        padding: "20px 10px 0 10px",
    },
    card: {
        height: 50,
        display: "flex",
        alignItems: "center",
    },
}));

export const TableHeaderContainer: React.FC<{ className?: string; sx?: SxProps }> = ({ children, className, sx }) => {
    const classes = useStyles();

    return (
        <div className={classes.container}>
            <Card elevation={2} className={className || classes.card} sx={sx}>
                {children}
            </Card>
        </div>
    );
};
