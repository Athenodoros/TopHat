import {
    Button,
    FormControl,
    InputAdornment,
    makeStyles,
    Menu,
    MenuItem,
    OutlinedInput,
    Typography,
} from "@material-ui/core";
import React, { useMemo, useState } from "react";
import { getCurrencyIcon } from "../../../components/display/ObjectDisplay";
import { Currency } from "../../../state/data";
import { useAllCurrencies } from "../../../state/data/hooks";
import { ID } from "../../../state/utilities/values";
import { Greys } from "../../../styles/colours";
import { onTextFieldChange } from "../../../utilities/events";
import { useDivBoundingRect, usePopoverProps } from "../../../utilities/hooks";

const useEditableCurrencyValueStyles = makeStyles({
    container: {
        display: "flex",
        alignItems: "center",
    },
    input: {
        "& .MuiInputBase-adornedStart": {
            paddingLeft: 3,

            "& .MuiInputAdornment-positionStart": {
                marginRight: 3,
            },
            "& .MuiInputBase-input::placeholder": {
                fontStyle: "italic",
            },
        },

        "& button": {
            minWidth: "inherit",
            padding: "0 5px",

            "& > .MuiButton-label": {
                color: Greys[500],
                fontWeight: 400,
            },
        },
    },
    icon: {
        height: 20,
        width: 20,
        borderRadius: 4,
        marginRight: 10,
    },
});

const NumberRegex = /^-?\d*\.?\d?\d?$/;

interface EditableCurrencyValueProps {
    currency: Currency;
    value: number | null;
    placeholder?: number | null;
    onChange: (value: number | null) => void;
}
export const EditableCurrencyValue: React.FC<EditableCurrencyValueProps> = ({
    currency,
    value,
    placeholder = null,
    onChange,
}) => {
    const classes = useEditableCurrencyValueStyles();
    const popover = usePopoverProps();

    const currencies = useAllCurrencies();

    const [text, setText] = useState(value !== null ? "" + value : "");
    const handleChange = useMemo(
        () =>
            onTextFieldChange((value) => {
                if (NumberRegex.test(value)) {
                    setText(value);

                    if (value === "") onChange(null);
                    else if (value === (+value).toString()) onChange(+value);
                }
            }),
        [setText, onChange]
    );

    return (
        <div className={classes.container}>
            <FormControl size="small" className={classes.input}>
                <OutlinedInput
                    value={text}
                    onChange={handleChange}
                    placeholder={placeholder !== null ? "" + placeholder : ""}
                    startAdornment={
                        <InputAdornment position="start">
                            <Button {...popover.buttonProps}>{currency.symbol}</Button>
                        </InputAdornment>
                    }
                />
            </FormControl>
            <Menu {...popover.popoverProps} style={{ maxHeight: 250 }}>
                {currencies.map((currency) => (
                    <MenuItem key={currency.id}>
                        {getCurrencyIcon(currency, classes.icon)}
                        <Typography variant="body1">{currency.longName}</Typography>
                    </MenuItem>
                ))}
            </Menu>
        </div>
    );
};

const useTransactionsTableObjectDropdownStyles = makeStyles({
    container: {
        width: "100%",
    },
    button: {
        width: "100%",
        height: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        textTransform: "inherit",
        color: "inherit",
    },
});
interface TransactionsTableObjectDropdownProps<T extends { id: ID; name: string }> {
    options: T[];
    selected: ID;
    select: (id: ID) => void;
    getIcon: (option: T, className: string) => React.ReactNode;
    iconClass: string;
}
export const TransactionsTableObjectDropdown = <T extends { id: ID; name: string }>({
    options,
    selected,
    select,
    getIcon,
    iconClass,
}: TransactionsTableObjectDropdownProps<T>) => {
    const popover = usePopoverProps();
    const classes = useTransactionsTableObjectDropdownStyles();
    const option = options.find(({ id }) => id === selected)!;
    const [{ width }, ref] = useDivBoundingRect();

    return (
        <div ref={ref} className={classes.container}>
            <Button variant="outlined" {...popover.buttonProps} className={classes.button}>
                {getIcon(option, iconClass)}
                <Typography variant="body1">{option.name}</Typography>
            </Button>
            <Menu {...popover.popoverProps} PaperProps={{ style: { maxHeight: 170, width } }}>
                {options.map((option) => (
                    <MenuItem key={option.id} onClick={() => select(option.id)}>
                        {getIcon(option, iconClass)}
                        <Typography variant="body1" noWrap={true}>
                            {option.name}
                        </Typography>
                    </MenuItem>
                ))}
            </Menu>
        </div>
    );
};
