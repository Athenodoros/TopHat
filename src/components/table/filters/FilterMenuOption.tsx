import styled from "@emotion/styled";
import { CheckBox, CheckBoxOutlineBlank } from "@mui/icons-material";
import { Checkbox, ListItemText, MenuItem } from "@mui/material";
import { SxProps } from "@mui/system";
import React from "react";
import { updateListSelection } from "../../../shared/data";
import { ID } from "../../../state/shared/values";

const IconSx = {
    height: 20,
    width: 20,
    borderRadius: "4px",
    marginRight: 10,
};
const OptionListItemText = styled(ListItemText)({
    padding: "4px 0",

    "& span": {
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        overflow: "hidden",
    },
});

interface FilterMenuOptionProps<T extends { id: ID; name: string }> {
    option: T;
    select: (ids: ID[]) => void;
    selected: ID[];
    getOptionIcon: (option: T, sx: SxProps) => React.ReactNode;
    getSecondary?: (option: T) => string;
}
const FilterMenuOptionFunction = <T extends { id: ID; name: string }>(
    { option, select, selected, getOptionIcon, getSecondary }: FilterMenuOptionProps<T>,
    ref: React.ForwardedRef<HTMLDivElement>
) => {
    return (
        <div ref={ref}>
            <MenuItem
                selected={selected.includes(option.id)}
                onClick={() => select(updateListSelection(option.id, selected))}
            >
                {getOptionIcon(option, IconSx)}
                <OptionListItemText primary={option.name} secondary={getSecondary && getSecondary(option)} />
                <Checkbox
                    icon={<CheckBoxOutlineBlank fontSize="small" />}
                    checkedIcon={<CheckBox fontSize="small" />}
                    style={{ marginRight: 8 }}
                    checked={selected.includes(option.id)}
                    color="primary"
                />
            </MenuItem>
        </div>
    );
};

/**
 * The material-ui `Menu` component passes in refs to its children - this allows a function component to use the ref.
 */
export const FilterMenuOption = React.forwardRef(FilterMenuOptionFunction) as <T extends { id: ID; name: string }>(
    props: FilterMenuOptionProps<T>
) => React.ReactElement;
