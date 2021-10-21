import { zipObject } from "../../../shared/data";
import { Notification } from "../../data/types";
import { AccountNotificationDefinition } from "./variants/accounts";
import { DebtNotificationDefinition } from "./variants/debt";
import { DemoNotificationDefinition } from "./variants/demo";
import { MilestoneNotificationDefinition } from "./variants/milestone";
import { UncategorisedNotificationDefinition } from "./variants/uncategorised";
export type { NotificationDisplayMetadata } from "./types";

const rules = [
    DemoNotificationDefinition,
    DebtNotificationDefinition,
    AccountNotificationDefinition,
    MilestoneNotificationDefinition,
    UncategorisedNotificationDefinition,
] as const;

const definitions = zipObject(
    rules.map((rule) => rule.id),
    rules
);
export const getNotificationDisplayMetadata = (notification: Notification) =>
    definitions[notification.id].display(notification);

/**
 * Eventually, there will be a function to loop through all notification types and look for hits.
 * It will need to store state for each type between sessions
 */
export const updateNotificationState = () => rules.forEach((rule) => rule.updateNotificationState());
