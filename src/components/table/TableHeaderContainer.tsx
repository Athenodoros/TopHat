import { Card, makeStyles } from "@material-ui/core";
import React from "react";

const useStyles = makeStyles((theme) => ({
    container: {
        height: 60,
        top: 0,
        position: "sticky",
        backgroundColor: theme.palette.background.default,
        zIndex: 1,
        margin: "-20px -10px 15px -10px",
        padding: "20px 10px 0 10px",
    },
    card: {
        height: 50,
        display: "flex",
        alignItems: "center",
    },
}));

export const TableHeaderContainer: React.FC = ({ children }) => {
    const classes = useStyles();

    return (
        <div className={classes.container}>
            <Card elevation={2} className={classes.card}>
                {children}
            </Card>
        </div>
    );
};
