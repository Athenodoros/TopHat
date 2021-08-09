import { makeStyles, Typography } from "@material-ui/core";
import React from "react";
import { Greys } from "../../../styles/colours";
import { stopEventPropagation } from "../../../utilities/events";
import { IconType } from "../../../utilities/types";

/**
 * Dialog Layout Components
 */
const useMainStyles = makeStyles({
    main: {
        display: "flex",
        backgroundColor: Greys[200],
        minHeight: 0,
        flexGrow: 1,
    },
});
export const DialogMain: React.FC<{ onClick?: () => void }> = ({ children, onClick }) => (
    <div onClick={onClick} className={useMainStyles().main}>
        {children}
    </div>
);

export const DIALOG_OPTIONS_WIDTH = 312;
const useOptionStyles = makeStyles({
    options: {
        display: "flex",
        flexDirection: "column",
        width: DIALOG_OPTIONS_WIDTH,
        flexShrink: 0,
    },
});
export const DialogOptions: React.FC = ({ children }) => <div className={useOptionStyles().options}>{children}</div>;

const useContentStyles = makeStyles({
    content: {
        display: "flex",
        justifyContent: "stretch",
        flexDirection: "column",
        margin: "12px 12px 12px 0",
        backgroundColor: Greys[100],
        borderRadius: 5,
        flexGrow: 1,
    },
});
export const DialogContents: React.FC = ({ children }) => (
    <div onClick={stopEventPropagation} className={useContentStyles().content}>
        {children}
    </div>
);

const usePlaceholderStyles = makeStyles({
    placeholder: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        flexGrow: 1,
        justifyContent: "center",
        padding: "0 60px 50px 60px",
    },
    subtext: {
        opacity: 0.8,
        textAlign: "center",
        marginTop: 10,
    },
});
export interface DialogPlaceholderDisplayProps {
    icon: IconType;
    title: string;
    subtext?: string;
}
export const DialogPlaceholderDisplay: React.FC<DialogPlaceholderDisplayProps> = ({ icon: Icon, title, subtext }) => {
    const classes = usePlaceholderStyles();

    return (
        <div className={classes.placeholder}>
            <Icon fontSize="large" htmlColor={Greys[600]} />
            <Typography variant="h6">{title}</Typography>
            {subtext !== undefined ? (
                <Typography variant="body2" className={classes.subtext}>
                    {subtext}
                </Typography>
            ) : undefined}
        </div>
    );
};
