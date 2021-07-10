import { Checkbox, ListItemText, makeStyles, MenuItem } from "@material-ui/core";
import { CheckBox, CheckBoxOutlineBlank } from "@material-ui/icons";
import React from "react";
import { ID } from "../../state/utilities/values";
import { updateListSelection } from "../../utilities/data";

const useStyles = makeStyles({
    icon: {
        height: 20,
        width: 20,
        borderRadius: 4,
        marginRight: 10,
    },
});

interface FilterMenuOptionProps<T extends { id: ID; name: string }> {
    option: T;
    select: (ids: ID[]) => void;
    selected: ID[];
    getOptionIcon: (option: T, className: string) => React.ReactNode;
}
const FilterMenuOptionFunction = <T extends { id: ID; name: string }>(
    { option, select, selected, getOptionIcon }: FilterMenuOptionProps<T>,
    ref: React.ForwardedRef<HTMLDivElement>
) => {
    const classes = useStyles();

    return (
        <div ref={ref}>
            <MenuItem
                selected={selected.includes(option.id)}
                onClick={() => select(updateListSelection(option.id, selected))}
            >
                {getOptionIcon(option, classes.icon)}
                <ListItemText>{option.name}</ListItemText>
                <Checkbox
                    icon={<CheckBoxOutlineBlank fontSize="small" />}
                    checkedIcon={<CheckBox fontSize="small" />}
                    style={{ marginRight: 8 }}
                    checked={selected.includes(option.id)}
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
