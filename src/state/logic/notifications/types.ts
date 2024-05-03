import React from "react";
import { IconType } from "../../../shared/types";
import { DataState } from "../../data";

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

export const DEMO_NOTIFICATION_ID = "demo";
export const ACCOUNTS_NOTIFICATION_ID = "old-accounts";
export const CURRENCY_NOTIFICATION_ID = "currency-sync-broken";
export const DEBT_NOTIFICATION_ID = "debt-level";
export const DROPBOX_NOTIFICATION_ID = "dropbox-sync-broken";
export const IDB_NOTIFICATION_ID = "idb-sync-failed";
export const MILESTONE_NOTIFICATION_ID = "new-milestone";
export const UNCATEGORISED_NOTIFICATION_ID = "uncategorised-transactions";
