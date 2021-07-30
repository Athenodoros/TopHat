import {
    Button,
    FormControl,
    IconButton,
    InputAdornment,
    makeStyles,
    Menu,
    MenuItem,
    OutlinedInput,
    Typography,
} from "@material-ui/core";
import { Clear, Help } from "@material-ui/icons";
import clsx from "clsx";
import React, { useCallback, useMemo } from "react";
import { getCurrencyIcon } from "../../../components/display/ObjectDisplay";
import { ObjectSelector, ObjectSelectorCommonProps } from "../../../components/inputs";
import { useAllCurrencies } from "../../../state/data/hooks";
import { ID } from "../../../state/utilities/values";
import { Greys } from "../../../styles/colours";
import { handleTextFieldChange, suppressEvent } from "../../../utilities/events";
import { useNumericInputHandler, usePopoverProps } from "../../../utilities/hooks";
import { useTransactionsTableStyles } from "./styles";

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
                width: 28,
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
interface EditableCurrencyValueProps {
    currency: ID | undefined;
    value: number | null | undefined;
    placeholder?: number | null;
    onChangeCurrency: (id: ID | undefined) => void;
    onChangeValue: (value?: number | null) => void;
    allowUndefinedCurrency?: boolean;
    allowUndefinedValue?: boolean;
}
export const EditableCurrencyValue: React.FC<EditableCurrencyValueProps> = ({
    currency,
    value,
    placeholder = null,
    onChangeCurrency,
    onChangeValue,
    allowUndefinedCurrency,
    allowUndefinedValue,
}) => {
    const classes = useEditableCurrencyValueStyles();
    const utilClasses = useTransactionsTableStyles();
    const popover = usePopoverProps();

    const currencies = useAllCurrencies();
    const symbol = currencies.find((c) => c.id === currency)?.symbol;

    const { text, setText, onTextChange } = useNumericInputHandler(value || null, onChangeValue);
    const setValueToUndefined = useCallback(() => {
        setText("");
        onChangeValue();
    }, [setText, onChangeValue]);

    return (
        <div className={classes.container}>
            <FormControl size="small" className={classes.input}>
                <OutlinedInput
                    value={text}
                    onChange={onTextChange}
                    placeholder={
                        allowUndefinedValue ? (value === undefined ? "(mixed)" : "(empty)") : "" + (placeholder || "")
                    }
                    startAdornment={
                        <InputAdornment position="start">
                            <Button {...popover.buttonProps}>
                                {currency !== undefined ? (
                                    symbol!
                                ) : (
                                    <Help fontSize="small" className={utilClasses.mixed} />
                                )}
                            </Button>
                        </InputAdornment>
                    }
                    endAdornment={
                        allowUndefinedValue ? (
                            <InputAdornment position="end">
                                <IconButton size="small" disabled={value === undefined} onClick={setValueToUndefined}>
                                    <Clear fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ) : undefined
                    }
                    inputProps={allowUndefinedValue ? { className: utilClasses.mixedPlaceholder } : undefined}
                />
            </FormControl>
            <Menu {...popover.popoverProps} style={{ maxHeight: 250 }}>
                {allowUndefinedCurrency ? (
                    <MenuItem onClick={() => onChangeCurrency(undefined)}>
                        <Typography variant="body1" className={utilClasses.mixed}>
                            (mixed)
                        </Typography>
                    </MenuItem>
                ) : undefined}
                {currencies.map((currency) => (
                    <MenuItem key={currency.id} onClick={() => onChangeCurrency(currency.id)}>
                        {getCurrencyIcon(currency, classes.icon)}
                        <Typography variant="body1">{currency.longName}</Typography>
                    </MenuItem>
                ))}
            </Menu>
        </div>
    );
};

interface EditableTextValueProps {
    value: string | null | undefined;
    placeholder?: string;
    allowUndefined: boolean;
    onChange: (value?: string | null) => void;
}
export const EditableTextValue: React.FC<EditableTextValueProps> = ({
    value,
    placeholder,
    allowUndefined,
    onChange,
}) => {
    const classes = useTransactionsTableStyles();
    const updateValue = useMemo(() => handleTextFieldChange((value) => onChange(value ? value : null)), [onChange]);
    const clearValue = useCallback(() => onChange(), [onChange]);

    return (
        <FormControl size="small">
            <OutlinedInput
                placeholder={allowUndefined ? (value === undefined ? "(mixed)" : "(empty)") : placeholder}
                value={value || ""}
                onChange={updateValue}
                inputProps={allowUndefined ? { className: classes.mixedPlaceholder } : undefined}
                endAdornment={
                    allowUndefined ? (
                        <InputAdornment position="end">
                            <IconButton size="small" disabled={value === undefined} onClick={clearValue}>
                                <Clear fontSize="small" />
                            </IconButton>
                        </InputAdornment>
                    ) : undefined
                }
            />
        </FormControl>
    );
};

// interface EditableBooleanValueProps {
//     Icon: IconType;
//     value: boolean | undefined;
//     allowUndefined: boolean;
//     onSelect: (value?: boolean) => void;
// }
// export const EditableBooleanValue: React.FC<EditableBooleanValueProps> = ({
//     Icon,
//     value,
//     allowUndefined,
//     onSelect,
// }) => {
//     const onClick = useCallback(
//         () =>
//             onSelect(
//                 allowUndefined
//                     ? { true: false, false: undefined, undefined: true }[("" + value) as "true" | "false" | "undefined"]
//                     : !value
//             ),
//         [value, allowUndefined, onSelect]
//     );

//     return (
//         <Button
//             onClick={onClick}
//             variant="outlined"
//             endIcon={
//                 value !== undefined ? (
//                     <Icon fontSize="small" style={{ color: value ? Intents.primary.main : Intents.danger.main }} />
//                 ) : (
//                     <Help fontSize="small" style={{ color: Greys[500] }} />
//                 )
//             }
//         />
//     );
// };

const useTransactionsTableObjectDropdownStyles = makeStyles({
    button: {
        width: "100%",
        height: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        textTransform: "inherit",
        color: "inherit",
    },
    label: {
        flexGrow: 1,
        textAlign: "left",
        overflow: "visible",
    },
});

interface TransactionsTableObjectDropdownProps<T extends { id: ID; name: string }> {
    options: T[];
    selected: ID | undefined;
    select: (id: ID | undefined) => void;
    getIcon: (option: T, className: string) => React.ReactNode;
    iconClass: string;
    allowUndefined?: boolean;
    button?: ObjectSelectorCommonProps<T>["children"];
}
export const TransactionsTableObjectDropdown = <T extends { id: ID; name: string }>({
    options,
    selected,
    select,
    getIcon,
    iconClass,
    allowUndefined,
    button,
}: TransactionsTableObjectDropdownProps<T>) => {
    const classes = useTransactionsTableObjectDropdownStyles();
    const MixedClass = useTransactionsTableStyles().mixed;
    const option = options.find(({ id }) => id === selected);

    const clearSelection = useCallback<React.MouseEventHandler>(
        (event) => {
            suppressEvent(event);
            select(undefined);
        },
        [select]
    );

    return (
        <ObjectSelector
            options={options}
            render={(option) => getIcon(option, iconClass)}
            MenuProps={{ PaperProps: { style: { maxHeight: 170 } } }}
            selected={selected}
            setSelected={select}
            placeholder={
                allowUndefined ? (
                    <MenuItem onClick={() => select(undefined)}>
                        <Typography variant="body1" noWrap={true} className={MixedClass}>
                            (mixed)
                        </Typography>
                    </MenuItem>
                ) : undefined
            }
        >
            {button || (
                <Button variant="outlined" className={classes.button} component="div">
                    {option && getIcon(option, iconClass)}
                    <Typography
                        variant="body1"
                        className={clsx(classes.label, option ? undefined : MixedClass)}
                        noWrap={true}
                    >
                        {option?.name || "(mixed)"}
                    </Typography>
                    {allowUndefined ? (
                        <IconButton disabled={selected === undefined} size="small" onClick={clearSelection}>
                            <Clear fontSize="small" />
                        </IconButton>
                    ) : undefined}
                </Button>
            )}
        </ObjectSelector>
    );
};
