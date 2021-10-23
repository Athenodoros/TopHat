import { zipObject } from "../../../shared/data";
import { subscribeToDataUpdates } from "../../data";
import { Notification } from "../../data/types";
import { AccountNotificationDefinition } from "./variants/accounts";
import { CurrencyNotificationDefinition } from "./variants/currency";
import { DebtNotificationDefinition } from "./variants/debt";
import { DemoNotificationDefinition } from "./variants/demo";
import { DropboxNotificationDefinition } from "./variants/dropbox";
import { IDBNotificationDefinition } from "./variants/idb";
import { MilestoneNotificationDefinition } from "./variants/milestone";
import { UncategorisedNotificationDefinition } from "./variants/uncategorised";
export type { NotificationDisplayMetadata } from "./types";

const rules = [
    DemoNotificationDefinition,
    IDBNotificationDefinition,
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

export const initialiseNotificationUpdateHook = () =>
    subscribeToDataUpdates((previous, current) =>
        rules.forEach((rule) => rule.maybeUpdateState && rule.maybeUpdateState(previous, current))
    );
