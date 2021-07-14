import { IconButton, IconButtonProps, useTheme } from "@material-ui/core";
import { FilterList } from "@material-ui/icons";
import { upperFirst } from "lodash";
import React, { ReactNode } from "react";
import { Intents } from "../../../styles/colours";

export const FilterIcon: React.FC<{
    ButtonProps?: IconButtonProps;
    badgeContent: ReactNode;
    margin?: "left" | "right";
}> = ({ ButtonProps = {}, badgeContent, margin = "left" }) => (
    <IconButton
        size="small"
        {...ButtonProps}
        style={{
            ["margin" + upperFirst(margin)]: 10,
            border: "1px solid " + (badgeContent ? Intents.primary.main : "transparent"),
            transition: useTheme().transitions.create("border-color"),
            ...ButtonProps.style,
        }}
    >
        <FilterList fontSize="small" color={badgeContent ? "primary" : "disabled"} />
    </IconButton>
);
