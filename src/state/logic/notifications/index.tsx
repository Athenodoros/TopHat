import { TopHatStore } from "../..";
import { zipObject } from "../../../shared/data";
import { Notification } from "../../data/types";
import { AccountNotificationDefinition } from "./variants/accounts";
import { CurrencyNotificationDefinition } from "./variants/currency";
import { DebtNotificationDefinition } from "./variants/debt";
import { DemoNotificationDefinition } from "./variants/demo";
import { DropboxNotificationDefinition } from "./variants/dropbox";
import { MilestoneNotificationDefinition } from "./variants/milestone";
import { UncategorisedNotificationDefinition } from "./variants/uncategorised";
export type { NotificationDisplayMetadata } from "./types";

const rules = [
    DemoNotificationDefinition,
    DebtNotificationDefinition,
    AccountNotificationDefinition,
    MilestoneNotificationDefinition,
    UncategorisedNotificationDefinition,
    CurrencyNotificationDefinition,
    DropboxNotificationDefinition,
] as const;

const definitions = zipObject(
    rules.map((rule) => rule.id),
    rules
);
export const getNotificationDisplayMetadata = (notification: Notification) =>
    definitions[notification.id].display(notification);

export const initialiseNotificationUpdateHook = () => {
    let previous = TopHatStore.getState().data;
    TopHatStore.subscribe(() => {
        const current = TopHatStore.getState().data;

        // This is to prevent infinite recursion
        const cache = previous;
        previous = current;

        console.log(previous, cache, current);

        rules.forEach((rule) => rule.maybeUpdateState && rule.maybeUpdateState(cache, current));
    });
};

export const updateNotificationState = () =>
    rules.forEach((rule) => rule.updateNotificationState && rule.updateNotificationState());
