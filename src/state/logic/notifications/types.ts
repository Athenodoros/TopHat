import React from "react";
import { IconType } from "../../../shared/types";
import { DataState } from "../../data";
import type { User } from "../../data/types";
import type { getSyncs } from "../storage";
import type { StorageState } from "../storage/types";

export interface NotificationDisplayMetadata {
    icon: IconType;
    title: string;
    dismiss?: (programatically: boolean) => void;
    colour: string;
    buttons?: {
        text: string;
        onClick: (close: () => void) => void;
    }[];
    children: React.ReactNode;
}

export interface NotificationRuleDefinition {
    id: string;
    display: (alert: { id: string; contents: string }) => NotificationDisplayMetadata;
    maybeUpdateState?: (previous: DataState | undefined, current: DataState) => void;
}

/**
 * A notification about this browser rather than the data, such as whether it can save. It is worked out
 * each time notifications are shown, rather than saved with the data, which would carry it to other devices.
 */
export interface DeviceNotificationDefinition {
    id: string;
    isShown: (device: DeviceState) => boolean;
    display: NotificationDisplayMetadata;
}

/** What device notifications are worked out from */
export interface DeviceState {
    storage: StorageState;
    syncs: ReturnType<typeof getSyncs>;
    user: User;
}

// Saved with the data, and kept up to date by the rules
export const DEMO_NOTIFICATION_ID = "demo";
export const ACCOUNTS_NOTIFICATION_ID = "old-accounts";
export const CURRENCY_NOTIFICATION_ID = "currency-sync-broken";
export const DEBT_NOTIFICATION_ID = "debt-level";
export const DROPBOX_NOTIFICATION_ID = "dropbox-sync-broken";
export const MILESTONE_NOTIFICATION_ID = "new-milestone";
export const UNCATEGORISED_NOTIFICATION_ID = "uncategorised-transactions";

/** Saved with the data by earlier versions, which no rule keeps now: removed wherever they're found */
export const RETIRED_NOTIFICATION_IDS = [
    // The IDB warning, which is a device notification now
    "idb-sync-failed",
];

// Device notifications, which are never saved
export const IDB_DEVICE_NOTIFICATION_ID = "idb-not-saving";
