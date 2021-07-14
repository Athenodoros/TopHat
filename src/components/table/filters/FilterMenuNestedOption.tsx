import { Badge, ListItemIcon, ListItemText, Menu, MenuItem, Popover } from "@material-ui/core";
import { ChevronRight } from "@material-ui/icons";
import React from "react";
import { NBSP } from "../../../utilities/constants";
import { suppressEvent } from "../../../utilities/events";
import { usePopoverProps } from "../../../utilities/hooks";
import { IconType } from "../../../utilities/types";

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
                <ListItemText>{name + NBSP + NBSP}</ListItemText>
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
export const FilterMenuNestedOption: React.FC<FilterMenuNestedOptionProps> =
    React.forwardRef(FilterMenuNestedOptionFunction);
