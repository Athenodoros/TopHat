import { makeStyles, Paper, Typography } from "@material-ui/core";
import clsx from "clsx";
import React from "react";
import { Greys } from "../../styles/colours";

export const SECTION_MARGIN = 40;
const useSectionStyles = makeStyles((theme) => ({
    section: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "stretch",
    },

    sectionHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
        height: 32,

        "& > h6": {
            color: Greys[600],
        },

        "& button": {
            color: Greys[600] + " !important",
            transition: theme.transitions.create("color"),
        },

        "& > div:last-child > *": {
            marginLeft: 20,
        },
    },

    sectionBody: {
        marginBottom: 50,
        flexGrow: 1,
        padding: 20,
    },
}));

export interface SectionProps {
    className?: string;
    title: string;
    headers?: React.ReactNode | React.ReactNode[];
    emptyBody?: boolean;
}
export const Section: React.FC<SectionProps> = ({ className, title, headers, children, emptyBody }) => {
    const classes = useSectionStyles();

    return (
        <div className={clsx(className, classes.section)}>
            <div className={classes.sectionHeader}>
                <Typography variant="h6">{title}</Typography>
                <div>{headers}</div>
            </div>
            {emptyBody ? (
                children
            ) : (
                <Paper className={classes.sectionBody} variant="outlined">
                    {children}
                </Paper>
            )}
        </div>
    );
};