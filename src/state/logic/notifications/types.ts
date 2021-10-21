import React from "react";
import { IconType } from "../../../shared/types";

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

export interface NotificationRuleDefinition {
    id: string;
    updateNotificationState: () => void;
    display: (alert: { id: string; contents: string }) => NotificationDisplayMetadata;
}
