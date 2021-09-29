import { CheckBox, CheckBoxOutlineBlank } from "@mui/icons-material";
import { Checkbox, MenuItem } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import React from "react";
import { ID } from "../../../state/utilities/values";
import { updateListSelection } from "../../../utilities/data";
import { PaddedListItemText } from "../../display/ListItems";

const useStyles = makeStyles({
    icon: {
        height: 20,
        width: 20,
        borderRadius: 4,
        marginRight: 10,
    },
    text: {
        "& span": {
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            overflow: "hidden",
        },
    },
});

interface FilterMenuOptionProps<T extends { id: ID; name: string }> {
    option: T;
    select: (ids: ID[]) => void;
    selected: ID[];
    getOptionIcon: (option: T, className: string) => React.ReactNode;
    getSecondary?: (option: T) => string;
}
const FilterMenuOptionFunction = <T extends { id: ID; name: string }>(
    { option, select, selected, getOptionIcon, getSecondary }: FilterMenuOptionProps<T>,
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
                <PaddedListItemText
                    className={classes.text}
                    primary={option.name}
                    secondary={getSecondary && getSecondary(option)}
                />
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
