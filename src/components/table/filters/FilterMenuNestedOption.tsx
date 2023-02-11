import styled from "@emotion/styled";
import { ChevronRight } from "@mui/icons-material";
import { Badge, ListItemIcon, ListItemText, Menu, MenuItem, Popover } from "@mui/material";
import React from "react";
import { NBSP } from "../../../shared/constants";
import { suppressEvent } from "../../../shared/events";
import { usePopoverProps } from "../../../shared/hooks";
import { FCWithChildren, IconType } from "../../../shared/types";

const PaddedListItemText = styled(ListItemText)({
    paddingTop: "4px",
    paddingBottom: "4px",
});

interface FilterMenuNestedOptionProps {
    icon: IconType;
    name: string;
    count: number | boolean | undefined;
    PopoverComponent?: typeof Menu | typeof Popover;
    maxHeight?: number;
}
export const FilterMenuNestedOptionFunction = (
    {
        icon: Icon,
        name,
        PopoverComponent = Menu,
        children,
        count = 0,
        maxHeight,
    }: React.PropsWithChildren<FilterMenuNestedOptionProps>,
    ref: React.ForwardedRef<HTMLDivElement>
) => {
    const { buttonProps, popoverProps, setIsOpen } = usePopoverProps<HTMLLIElement>();

    return (
        <div ref={ref}>
            <MenuItem
                disableRipple={true}
                ref={buttonProps.ref}
                onClick={suppressEvent}
                onMouseEnter={() => setIsOpen(true)}
                onMouseLeave={() => setIsOpen(false)}
            >
                <ListItemIcon>
                    <Badge
                        badgeContent={Number(count)}
                        color="primary"
                        variant={typeof count === "boolean" ? "dot" : "standard"}
                    >
                        <Icon fontSize="small" />
                    </Badge>
                </ListItemIcon>
                <PaddedListItemText>{name + NBSP + NBSP}</PaddedListItemText>
                <ChevronRight fontSize="small" />
                <PopoverComponent
                    {...popoverProps}
                    style={{ pointerEvents: "none" }}
                    PaperProps={{ elevation: 4, style: { minWidth: 300, maxHeight } }}
                    anchorOrigin={{ vertical: "top", horizontal: "right" }}
                    transformOrigin={{ vertical: "top", horizontal: "left" }}
                >
                    <div style={{ pointerEvents: "auto" }}>{children}</div>
                </PopoverComponent>
            </MenuItem>
        </div>
    );
};

/**
 * The material-ui `Menu` component passes in refs to its children - this allows a function component to use the ref.
 */
export const FilterMenuNestedOption: FCWithChildren<FilterMenuNestedOptionProps> =
    React.forwardRef(FilterMenuNestedOptionFunction);
