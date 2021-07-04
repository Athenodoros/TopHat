import { Button, IconButton, makeStyles, useTheme } from "@material-ui/core";
import { Clear, NoteAdd, Payment, TrendingUp } from "@material-ui/icons";
import clsx from "clsx";
import React from "react";
import { Intents } from "../../styles/colours";
import { IconType } from "../../utilities/types";

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
        fontWeight: 500,
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

interface NotificationProps {
    icon: IconType;
    title: string;
    dismiss?: () => void;
    colour: string;
    buttons?: {
        text: string;
        onClick: () => void;
    }[];
}
export const Notification: React.FC<NotificationProps> = ({
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
                <p className={clsx("bp3-text-large", classes.headerTitle)}>{title}</p>
                <IconButton onClick={dismiss} size="small">
                    <Clear fontSize="inherit" />
                </IconButton>
            </div>
            <div className="bp3-running-text">{children}</div>
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

export const Notifications: React.FC = () => {
    const { palette } = useTheme();
    const classes = useStyles();

    return (
        <>
            <Notification
                icon={TrendingUp}
                title="New Milestone Reached!"
                dismiss={console.log}
                colour={palette.success.main}
                buttons={[{ text: "Update", onClick: console.log }]}
            >
                You have a net worth of over <p className={classes.numberGreen}>AU$200k</p>, and more every day. Keep up
                the good work!
            </Notification>
            <Notification
                icon={Payment}
                title="Uncategorised Transactions"
                dismiss={console.log}
                colour={palette.warning.main}
                buttons={[{ text: "Update", onClick: console.log }]}
            >
                There are <strong className={classes.numberOrange}>3</strong> transactions which haven’t been allocated
                to categories.
            </Notification>
            <Notification
                icon={NoteAdd}
                title="Statement Ready"
                dismiss={console.log}
                colour={palette.info.main}
                buttons={[{ text: "Upload", onClick: console.log }]}
            >
                The account should have a new statement available.
            </Notification>
        </>
    );
};
