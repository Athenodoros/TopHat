import { Paper, Typography } from "@mui/material";
import makeStyles from '@mui/styles/makeStyles';
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
    PaperClassName?: string;
    title?: string;
    headers?: React.ReactNode | React.ReactNode[];
    emptyBody?: boolean;
    onClick?: () => void;
}
export const Section: React.FC<SectionProps> = ({
    className,
    PaperClassName,
    title,
    headers,
    children,
    emptyBody,
    onClick,
}) => {
    const classes = useSectionStyles();

    return (
        <div className={clsx(className, classes.section)}>
            {title || headers ? (
                <div className={classes.sectionHeader}>
                    <Typography variant="h6">{title}</Typography>
                    <div>{headers}</div>
                </div>
            ) : undefined}
            {emptyBody ? (
                children
            ) : (
                <Paper className={clsx(classes.sectionBody, PaperClassName)} variant="outlined" onClick={onClick}>
                    {children}
                </Paper>
            )}
        </div>
    );
};
