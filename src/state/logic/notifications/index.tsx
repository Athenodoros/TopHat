import { createNextState } from "@reduxjs/toolkit";
import { isEqual } from "lodash-es";
import { TopHatDispatch, TopHatStore } from "../..";
import { zipObject } from "../../../shared/data";
import { DataSlice, DataState, subscribeToDataUpdates, toListDataState } from "../../data";
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

const runNotificationRules = (previous: DataState | undefined, current: DataState) =>
    rules.forEach((rule) => rule.maybeUpdateState && rule.maybeUpdateState(previous, current));

export const initialiseNotificationUpdateHook = () => {
    subscribeToDataUpdates(runNotificationRules);

    // Some conditions, like IndexedDB failing to open, arise during boot - before the hook above
    // existed - so run the rules once now rather than waiting for the user's first change. Any change
    // is loaded the way saved data is, so that it doesn't show up in the undo history.
    const current = TopHatStore.getState().data;
    const updated = createNextState(current, (draft) => runNotificationRules(undefined, draft));
    if (!isEqual(current, updated)) TopHatDispatch(DataSlice.actions.setFromIndexedDB(toListDataState(updated)));
};
