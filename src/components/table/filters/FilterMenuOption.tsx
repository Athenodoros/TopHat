import { Avatar, Checkbox, ListItemText, makeStyles, MenuItem, Typography } from "@material-ui/core";
import { AccountBalance, CheckBox, CheckBoxOutlineBlank, ShoppingCart } from "@material-ui/icons";
import { last } from "lodash";
import React, { useCallback } from "react";
import { Institution } from "../../../state/data";
import { useInstitutionMap } from "../../../state/data/hooks";
import { Account, AccountTypes, Category, Currency } from "../../../state/data/types";
import { ID } from "../../../state/utilities/values";
import { updateListSelection } from "../../../utilities/data";

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

export const useGetAccountIcon = () => {
    const institutions = useInstitutionMap();
    return useCallback(
        (account: Account, className: string) => (
            <Avatar src={institutions[account.institution!]?.icon} className={className}>
                <AccountBalance style={{ height: "60%" }} />
            </Avatar>
        ),
        [institutions]
    );
};
export const getInstitutionIcon = (institution: Institution, className: string) => (
    <Avatar src={institution.icon} className={className}>
        <AccountBalance style={{ height: "60%" }} />
    </Avatar>
);
export const getCategoryIcon = (category: Category | undefined, className: string) => (
    <Avatar className={className} style={{ backgroundColor: category?.colour }}>
        <ShoppingCart style={{ height: "60%" }} />
    </Avatar>
);
export const getAccountCategoryIcon = (type: typeof AccountTypes[number], className: string) => (
    <Avatar className={className} style={{ backgroundColor: type.colour }}>
        <type.icon style={{ height: "60%" }} />
    </Avatar>
);
export const getCurrencyIcon = (currency: Currency, className: string) => (
    <Avatar className={className} style={{ backgroundColor: currency.colour }}>
        <Typography variant="button">{last(currency.symbol)}</Typography>
    </Avatar>
);
