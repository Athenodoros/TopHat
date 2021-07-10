import { Payment, PostAdd, TrendingUp } from "@material-ui/icons";
import { TopHatDispatch } from "..";
import { Intents } from "../../styles/colours";
import { IconType } from "../../utilities/types";
import { DataSlice } from "../data";
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
            buttons: [{ text: "Update", onClick: console.log }],
            children:
                "You have a net worth of over <p className={classes.numberGreen}>AU$200k</p>, and more every day. Keep up the good work!",
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
            buttons: [{ text: "Update", onClick: console.log }],
            children:
                "There are <strong className={classes.numberOrange}>3</strong> transactions which haven’t been allocated to categories.",
        }),
    },
    "statement-ready": {
        id: "statement-ready",
        surfaceAlerts: () => [],
        display: (alert) => ({
            icon: PostAdd,
            title: "Statement Ready",
            dismiss: defaultDismissNotification(alert.id),
            colour: Intents.primary.main,
            buttons: [{ text: "Upload", onClick: console.log }],
            children: "The account should have a new statement available.",
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
