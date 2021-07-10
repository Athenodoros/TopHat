import { Button, IconButton, makeStyles, Typography } from "@material-ui/core";
import { Clear } from "@material-ui/icons";
import React from "react";
import { useAllNotifications } from "../../state/data/hooks";
import { getNotificationDisplayMetadata, NotificationDisplayMetadata } from "../../state/logic/notifications";
import { Intents } from "../../styles/colours";

const useStyles = makeStyles((theme) => ({
    notification: {
        display: "flex",
        flexDirection: "column",
        borderLeft: "3px solid transparent",
        position: "relative",
        overflow: "hidden",
        padding: "0 17px",
        fontSize: 20,

        marginBottom: 20,
        "&:first-child": {
            marginTop: 20,
        },
    },

    backdrop: {
        position: "absolute",
        width: 240,
        height: 240,
        left: -242.71,
        top: -97.83,
        opacity: 0.1,
        borderRadius: 40,
        transform: "rotate(20deg)",
        transformOrigin: "bottom left",
    },

    header: {
        display: "flex",
        alignItems: "center",
        margin: "9px 0 7px 0",
    },
    headerIcon: {
        marginRight: 23,
    },
    headerTitle: {
        flexGrow: 1,
    },

    buttons: {
        display: "flex",
        justifyContent: "flex-end",
        margin: 5,
    },

    numberGreen: {
        fontWeight: 600,
        color: Intents.success.main,
        display: "inline",
    },
    numberOrange: {
        fontWeight: 600,
        color: Intents.warning.main,
        display: "inline",
    },
}));

const NotificationDisplay: React.FC<NotificationDisplayMetadata> = ({
    icon: Icon,
    title,
    dismiss,
    colour,
    buttons,
    children,
}) => {
    const classes = useStyles();

    return (
        <div className={classes.notification} style={{ borderColor: colour }}>
            <div className={classes.backdrop} style={{ backgroundColor: colour }} />
            <div className={classes.header}>
                <Icon className={classes.headerIcon} />
                <Typography variant="subtitle2" className={classes.headerTitle}>
                    {title}
                </Typography>
                <IconButton onClick={dismiss} size="small">
                    <Clear fontSize="inherit" />
                </IconButton>
            </div>
            <Typography variant="body2" component="span">
                {children}
            </Typography>
            {buttons && (
                <div className={classes.buttons}>
                    {buttons.map(({ text, onClick }, idx) => (
                        <Button onClick={onClick} size="small" key={idx}>
                            {text}
                        </Button>
                    ))}
                </div>
            )}
        </div>
    );
};

export const Notifications: React.FC = () => (
    <>
        {useAllNotifications().map((notification) => (
            <NotificationDisplay key={notification.id} {...getNotificationDisplayMetadata(notification)} />
        ))}
    </>
);
