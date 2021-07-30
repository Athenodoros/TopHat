import { makeStyles, Typography } from "@material-ui/core";
import React from "react";
import { Greys } from "../../styles/colours";
import { suppressEvent } from "../../utilities/events";
import { IconType } from "../../utilities/types";

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

const useOptionStyles = makeStyles({
    options: {
        display: "flex",
        flexDirection: "column",
        width: 312,
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
    <div onClick={suppressEvent} className={useContentStyles().content}>
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
export const DialogPlaceholderDisplay: React.FC<{ icon: IconType; title: string; subtext: string }> = ({
    icon: Icon,
    title,
    subtext,
}) => {
    const classes = usePlaceholderStyles();

    return (
        <div className={classes.placeholder}>
            <Icon fontSize="large" htmlColor={Greys[600]} />
            <Typography variant="h6">{title}</Typography>
            <Typography variant="body2" className={classes.subtext}>
                {subtext}
            </Typography>
        </div>
    );
};

/**
 * Dialog Page Components
 */
const useEditContainerStyles = makeStyles({
    container: {
        display: "flex",
        alignItems: "center",
        margin: "10px 0",
    },
    label: {
        flex: "0 0 150px",
        textAlign: "right",
        paddingRight: 30,
        color: Greys[600],
        textTransform: "uppercase",
    },
    title: {
        color: Greys[600],
        textTransform: "uppercase",
        marginTop: 20,
    },
});
export const EditValueContainer: React.FC<{ label: string }> = ({ label, children }) => {
    const classes = useEditContainerStyles();

    return (
        <div className={classes.container}>
            <Typography variant="subtitle2" noWrap={true} className={classes.label}>
                {label}
            </Typography>
            {children}
        </div>
    );
};

export const EditTitleContainer: React.FC<{ title: string }> = ({ title }) => (
    <EditValueContainer label="">
        <Typography variant="overline" className={useEditContainerStyles().title}>
            {title}
        </Typography>
    </EditValueContainer>
);
