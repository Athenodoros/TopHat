import { FilterList } from "@mui/icons-material";
import { IconButton, IconButtonProps, useTheme } from "@mui/material";
import { upperFirst } from "lodash";
import React, { ReactNode } from "react";
import { withSuppressEvent } from "../../../shared/events";
import { IconType } from "../../../shared/types";
import { Intents } from "../../../styles/colours";

export const FilterIcon: React.FC<{
    ButtonProps?: IconButtonProps;
    badgeContent: ReactNode;
    margin?: "left" | "right" | "none";
    Icon?: IconType;
    onRightClick?: () => void;
}> = ({ ButtonProps = {}, badgeContent, margin = "left", Icon = FilterList, onRightClick }) => (
    <IconButton
        size="small"
        {...ButtonProps}
        style={{
            padding: 3,
            border: "1px solid " + (badgeContent ? Intents.primary.main : "transparent"),
            transition: useTheme().transitions.create("border-color"),
            ...ButtonProps.style,
            ...(margin !== "none" ? { ["margin" + upperFirst(margin)]: 10 } : undefined),
        }}
        onContextMenu={onRightClick && withSuppressEvent<HTMLButtonElement>(onRightClick)}
    >
        <Icon fontSize="small" color={badgeContent ? "primary" : "disabled"} />
    </IconButton>
);
