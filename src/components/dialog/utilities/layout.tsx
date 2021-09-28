import makeStyles from '@mui/styles/makeStyles';
import React from "react";
import { Greys } from "../../../styles/colours";
import { stopEventPropagation } from "../../../utilities/events";

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
        overflow: "hidden",
    },
});
export const DialogContents: React.FC = ({ children }) => (
    <div onClick={stopEventPropagation} className={useContentStyles().content}>
        {children}
    </div>
);
