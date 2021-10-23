import React from "react";
import { IconType } from "../../../shared/types";
import { DataState } from "../../data";

export interface NotificationDisplayMetadata {
    icon: IconType;
    title: string;
    dismiss?: () => void;
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
