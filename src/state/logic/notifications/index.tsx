import { createNextState } from "@reduxjs/toolkit";
import { isEqual } from "lodash-es";
import { useMemo, useSyncExternalStore } from "react";
import { shallowEqual } from "react-redux";
import { TopHatDispatch, TopHatStore } from "../..";
import { zipObject } from "../../../shared/data";
import { DataSlice, DataState, removeNotification, subscribeToDataUpdates, toListDataState } from "../../data";
import { Notification, StubUserID } from "../../data/types";
import { useSelector } from "../../shared/hooks";
import { getSyncs, subscribeToSyncs } from "../storage";
import { AccountNotificationDefinition } from "./variants/accounts";
import { CurrencyNotificationDefinition } from "./variants/currency";
import { DebtNotificationDefinition } from "./variants/debt";
import { DemoNotificationDefinition } from "./variants/demo";
import { DropboxNotificationDefinition } from "./variants/dropbox";
import { IDBNotificationDefinition } from "./variants/idb";
import {
    DeviceNotificationDefinition,
    DeviceState,
    NotificationDisplayMetadata,
    RETIRED_NOTIFICATION_IDS,
} from "./types";
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
const runNotificationRules = (previous: DataState | undefined, current: DataState) => {
    RETIRED_NOTIFICATION_IDS.forEach((id) => removeNotification(current, id));
    rules.forEach((rule) => rule.maybeUpdateState && rule.maybeUpdateState(previous, current));
};

const deviceDefinitions: DeviceNotificationDefinition[] = [IDBNotificationDefinition];

/**
 * Every notification to show, device notifications first. A saved one this version has no rule for - added
 * by a newer version, say - is left out, but left in the data.
 */
export const getNotifications = (
    saved: Notification[],
    device: DeviceState
): { key: string; display: NotificationDisplayMetadata }[] =>
    deviceDefinitions
        .filter((definition) => definition.isShown(device))
        .map(({ id, display }) => ({ key: id, display }))
        .concat(
            saved.flatMap((notification) => {
                const definition = definitions[notification.id];
                if (definition === undefined) return [];
                return [
                    { key: notification.id + "-" + notification.contents, display: definition.display(notification) },
                ];
            })
        );

export const useNotifications = () => {
    const saved = useSelector(
        (state) => state.data.notification.ids.map((id) => state.data.notification.entities[id]!),
        shallowEqual
    );
    const storage = useSelector((state) => state.app.storage);
    const syncs = useSyncExternalStore(subscribeToSyncs, getSyncs);
    const user = useSelector((state) => state.data.user.entities[StubUserID]!);
    return useMemo(() => getNotifications(saved, { storage, syncs, user }), [saved, storage, syncs, user]);
};

export const initialiseNotificationUpdateHook = () => {
    subscribeToDataUpdates(runNotificationRules);

    // Some conditions, like IndexedDB failing to open, arise during boot - before the hook above
    // existed - so run the rules once now rather than waiting for the user's first change. Any change
    // is loaded the way saved data is, so that it doesn't show up in the undo history.
    const current = TopHatStore.getState().data;
    const updated = createNextState(current, (draft) => runNotificationRules(undefined, draft));
    if (!isEqual(current, updated)) TopHatDispatch(DataSlice.actions.setFromStorage(toListDataState(updated)));
};
