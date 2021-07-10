import { Badge, ListItemIcon, ListItemText, Menu, MenuItem } from "@material-ui/core";
import { ChevronRight } from "@material-ui/icons";
import React from "react";
import { ID } from "../../state/utilities/values";
import { NBSP } from "../../utilities/constants";
import { suppressEvent } from "../../utilities/events";
import { usePopoverProps } from "../../utilities/hooks";
import { IconType } from "../../utilities/types";
import { FilterMenuOption } from "./FilterMenuOption";

interface NestedMenuSelectorProps<T extends { id: ID; name: string }> {
    icon: IconType;
    name: string;
    select: (ids: ID[]) => void;
    selected: ID[];
    options: T[];
    getOptionIcon: (option: T, className: string) => React.ReactNode;
}
const NestedMenuSelectorFunction = <T extends { id: ID; name: string }>(
    { icon: Icon, name, options, ...OptionProps }: NestedMenuSelectorProps<T>,
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
                    <Badge badgeContent={OptionProps.selected.length} color="primary">
                        <Icon fontSize="small" />
                    </Badge>
                </ListItemIcon>
                <ListItemText>{name + NBSP + NBSP}</ListItemText>
                <ChevronRight fontSize="small" />
                <Menu
                    {...popoverProps}
                    style={{ pointerEvents: "none" }}
                    PaperProps={{ elevation: 4, style: { width: 300, maxHeight: 250 } }}
                    anchorOrigin={{ vertical: "top", horizontal: "right" }}
                    transformOrigin={{ vertical: "top", horizontal: "left" }}
                >
                    <div style={{ pointerEvents: "auto" }}>
                        {options.map((option) => (
                            <FilterMenuOption key={option.id} option={option} {...OptionProps} />
                        ))}
                    </div>
                </Menu>
            </MenuItem>
        </div>
    );
};

/**
 * The material-ui `Menu` component passes in refs to its children - this allows a function component to use the ref.
 */
export const NestedMenuSelector = React.forwardRef(NestedMenuSelectorFunction) as <T extends { id: ID; name: string }>(
    props: NestedMenuSelectorProps<T>
) => React.ReactElement;
