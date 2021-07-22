import { Avatar, makeStyles, styled, Typography } from "@material-ui/core";
import { AccountBalance, NoteAdd, Payment, TrendingUp } from "@material-ui/icons";
import { noop } from "lodash";
import numeral from "numeral";
import React from "react";
import { TopHatDispatch } from "..";
import { Greys, Intents } from "../../styles/colours";
import { IconType } from "../../utilities/types";
import { DataSlice } from "../data";
import { useAccountByID, useDefaultCurrency, useInstitutionByID } from "../data/hooks";
import { Notification, NotificationRuleDefinitions } from "../data/types";
import { ID } from "../utilities/values";

export interface NotificationDisplayMetadata {
    icon: IconType;
    title: string;
    dismiss?: () => void;
    colour: string;
    buttons?: {
        text: string;
        onClick: () => void;
    }[];
    children: React.ReactNode;
}

const GreenText = styled("strong")({ color: Intents.success.main });
const OrangeText = styled("strong")({ color: Intents.warning.main });
const NotificationContents: React.FC = ({ children }) => (
    <Typography variant="body2" component="span">
        {children}
    </Typography>
);

const NewMilestoneContents: React.FC<{ value: number }> = ({ value }) => {
    const { symbol } = useDefaultCurrency();
    return (
        <NotificationContents>
            You have a net worth of over <GreenText>{symbol + " " + numeral(value).format("0a")}</GreenText>, and more
            every day. Keep up the good work!
        </NotificationContents>
    );
};
const useStatementReadyStyles = makeStyles({
    container: {
        margin: "-2px 6px 0 6px",
        display: "inline-flex",
        padding: 4,
        background: Greys[100],
        border: "1px solid " + Greys[300],
        borderRadius: 4,
        alignItems: "center",
        verticalAlign: "middle",
    },
    icon: {
        height: 16,
        width: 16,
        borderRadius: 3,
        marginRight: 5,
    },
});
const StatementReadyContents: React.FC<{ id: ID }> = ({ id }) => {
    const classes = useStatementReadyStyles();
    const account = useAccountByID(id);
    const institution = useInstitutionByID(account.institution);

    return (
        <NotificationContents>
            The account
            <div className={classes.container}>
                <Avatar src={institution?.icon} className={classes.icon}>
                    <AccountBalance style={{ height: "60%" }} />
                </Avatar>
                <strong>{account.name}</strong>
            </div>
            should have a new statement available.
        </NotificationContents>
    );
};

const defaultDismissNotification = (id: ID) => () => TopHatDispatch(DataSlice.actions.deleteNotification(id));
const RuleDefinitions: {
    [Key in keyof NotificationRuleDefinitions]: {
        id: Key;
        surfaceAlerts: () => NotificationRuleDefinitions[Key][];
        display: (alert: Notification<Key>) => NotificationDisplayMetadata;
    };
} = {
    "new-milestone": {
        id: "new-milestone",
        surfaceAlerts: () => [],
        display: (alert) => ({
            icon: TrendingUp,
            title: "New Milestone Reached!",
            dismiss: defaultDismissNotification(alert.id),
            colour: Intents.success.main,
            buttons: [{ text: "Update", onClick: noop }],
            children: <NewMilestoneContents value={alert.contents} />,
        }),
    },
    "uncategorised-transactions": {
        id: "uncategorised-transactions",
        surfaceAlerts: () => [],
        display: (alert) => ({
            icon: Payment,
            title: "Uncategorised Transactions",
            dismiss: defaultDismissNotification(alert.id),
            colour: Intents.warning.main,
            buttons: [{ text: "Update", onClick: noop }],
            children: (
                <NotificationContents>
                    There are <OrangeText>{alert.contents}</OrangeText> transactions which haven’t been allocated to
                    categories.
                </NotificationContents>
            ),
        }),
    },
    "statement-ready": {
        id: "statement-ready",
        surfaceAlerts: () => [],
        display: (alert) => ({
            icon: NoteAdd,
            title: "Statement Ready",
            dismiss: defaultDismissNotification(alert.id),
            colour: Intents.primary.main,
            buttons: [{ text: "Upload", onClick: noop }],
            children: <StatementReadyContents id={alert.contents} />,
        }),
    },
};

export const getNotificationDisplayMetadata = (notification: Notification) =>
    RuleDefinitions[notification.type].display(notification as any);

/**
 * Eventually, there will be a function to loop through all notification types and look for hits.
 * It will need to store state for each type between sessions
 */
// export const updateNotificationState = () =>
//   TopHatDispatch(DataSlice.actions.createAlerts(
//     values(RuleDefinitions).flatMap(({ surfaceAlerts }) => surfaceAlerts())
//   ))
