import { Menu, MenuProps } from "@material-ui/core";
import React from "react";
import { ID } from "../../state/utilities/values";
import { FilterMenuOption } from "./FilterMenuOption";

interface FilterMenuProps<T extends { id: ID; name: string }> {
    options: T[];
    select: (ids: ID[]) => void;
    selected: ID[];
    getOptionIcon: (option: T, className: string) => React.ReactNode;
    MenuProps: MenuProps;
}
export const FilterMenu = <T extends { id: ID; name: string }>({
    options,
    MenuProps,
    ...MenuOptionProps
}: FilterMenuProps<T>) => (
    <Menu {...MenuProps}>
        {options.map((option) => (
            <FilterMenuOption key={option.id} option={option} {...MenuOptionProps} />
        ))}
    </Menu>
);
