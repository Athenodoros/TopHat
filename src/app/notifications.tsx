import { CheckCircleOutline, Clear } from "@mui/icons-material";
import { Button, Collapse, Fade, IconButton, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { Box, SxProps } from "@mui/system";
import React, { useCallback, useState } from "react";
import { NonIdealState } from "../components/display/NonIdealState";
import { useAllNotifications } from "../state/data/hooks";
import { getNotificationDisplayMetadata, NotificationDisplayMetadata } from "../state/logic/notifications";
import { Greys } from "../styles/colours";

const useStyles = makeStyles({
    container: {
        marginBottom: 20,
        "&:first-of-type": {
            marginTop: 20,
        },
    },

    notification: {
        display: "flex",
        flexDirection: "column",
        borderLeft: "3px solid transparent",
        position: "relative",
        overflow: "hidden",
        padding: "0 17px",
        fontSize: 20,
        // width: 350,
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
        margin: 3,
        marginRight: 23,
    },
    headerTitle: {
        flexGrow: 1,
    },

    padding: {
        height: 25,
    },

    buttons: {
        display: "flex",
        justifyContent: "flex-end",
        margin: 5,

        "& > *": {
            marginLeft: 10,
        },
    },
});

const NotificationDisplay: React.FC<NotificationDisplayMetadata> = ({
    icon: Icon,
    title,
    dismiss,
    colour,
    buttons,
    children,
}) => {
    const classes = useStyles();
    const [grow, setGrow] = useState(true);

    const [closedProgrammatically, setClosedProgrammatically] = useState(false);
    const programmaticDismiss = useCallback(() => {
        setGrow(false);
        setClosedProgrammatically(true);
    }, []);
    const onExited = useCallback(() => dismiss && dismiss(closedProgrammatically), [dismiss, closedProgrammatically]);

    return (
        <Collapse in={grow} onExited={onExited} className={classes.container}>
            <Fade in={grow}>
                <div className={classes.notification} style={{ borderColor: colour }}>
                    <div className={classes.backdrop} style={{ backgroundColor: colour }} />
                    <div className={classes.header}>
                        <Icon className={classes.headerIcon} htmlColor={Greys[800]} fontSize="small" />
                        <Typography variant="subtitle2" className={classes.headerTitle}>
                            {title}
                        </Typography>
                        {dismiss && (
                            <IconButton onClick={() => setGrow(false)} size="small">
                                <Clear fontSize="inherit" />
                            </IconButton>
                        )}
                    </div>
                    {children}
                    {buttons ? (
                        <div className={classes.buttons}>
                            {buttons.map(({ text, onClick }, idx) => (
                                <Button
                                    onClick={() => onClick(programmaticDismiss)}
                                    size="small"
                                    key={idx}
                                    color="inherit"
                                >
                                    {text}
                                </Button>
                            ))}
                        </div>
                    ) : (
                        <div className={classes.padding} />
                    )}
                </div>
            </Fade>
        </Collapse>
    );
};

export const Notifications: React.FC<{ sx?: SxProps }> = ({ sx }) => {
    const notifications = useAllNotifications();

    return (
        <Box sx={{ width: 350, overflowY: "auto", ...sx }}>
            {notifications.length ? (
                notifications.map((notification) => (
                    <NotificationDisplay
                        key={notification.id + "-" + notification.contents}
                        {...getNotificationDisplayMetadata(notification)}
                    />
                ))
            ) : (
                <NonIdealState icon={CheckCircleOutline} title="No Notifications!" intent="app" />
            )}
        </Box>
    );
};
