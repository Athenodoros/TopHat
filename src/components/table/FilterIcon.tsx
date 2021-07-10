import { Badge, IconButton, IconButtonProps } from "@material-ui/core";
import { FilterList } from "@material-ui/icons";
import React, { ReactNode } from "react";

export const FilterIcon: React.FC<{ ButtonProps: IconButtonProps; badgeContent: ReactNode }> = ({
    ButtonProps,
    badgeContent,
}) => (
    <Badge badgeContent={badgeContent} variant="dot" color="primary">
        <IconButton size="small" {...ButtonProps}>
            <FilterList fontSize="small" />
        </IconButton>
    </Badge>
);
