import styled from "@emotion/styled";
import { Clear, Help } from "@mui/icons-material";
import {
    Button,
    IconButton,
    InputAdornment,
    inputAdornmentClasses,
    inputBaseClasses,
    Menu,
    MenuItem,
    MenuProps,
    TextField,
    Typography,
} from "@mui/material";
import { Box, SxProps } from "@mui/system";
import React, { useCallback, useMemo } from "react";
import { handleTextFieldChange } from "../../../shared/events";
import { useNumericInputHandler, usePopoverProps } from "../../../shared/hooks";
import { useAllCurrencies } from "../../../state/data/hooks";
import { ID } from "../../../state/shared/values";
import { Greys } from "../../../styles/colours";
import { getCurrencyIconSx } from "../../display/ObjectDisplay";
import { ObjectSelector, ObjectSelectorCommonProps } from "../../inputs";
import { TransactionTableMixedTypography, TransactionTableSxProps } from "./styles";

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
    const popover = usePopoverProps();

    const currencies = useAllCurrencies();
    const symbol = currencies.find((c) => c.id === currency)?.symbol;

    const { text, setText, onTextChange } = useNumericInputHandler(value || null, onChangeValue);
    const setValueToUndefined = useCallback(() => {
        setText("");
        onChangeValue();
    }, [setText, onChangeValue]);

    return (
        <CurrencyContainerBox>
            <CurrencyInputTextField
                variant="outlined"
                size="small"
                value={text}
                onChange={onTextChange}
                placeholder={
                    allowUndefinedValue ? (value === undefined ? "(mixed)" : "(none)") : "" + (placeholder || "(none)")
                }
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <Button {...popover.buttonProps}>
                                {currency !== undefined ? symbol! : <CurrencyIconMixedHelpIcon fontSize="small" />}
                            </Button>
                        </InputAdornment>
                    ),
                    endAdornment:
                        allowUndefinedValue && value !== undefined ? (
                            <InputAdornment position="end">
                                <IconButton size="small" onClick={setValueToUndefined}>
                                    <Clear fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ) : undefined,
                }}
                inputProps={{
                    sx:
                        !value && !placeholder
                            ? TransactionTableSxProps.MixedPlaceholder
                            : TransactionTableSxProps.BasePlaceholder,
                }}
            />
            <Menu {...popover.popoverProps} style={{ maxHeight: 250 }}>
                {allowUndefinedCurrency ? (
                    <MenuItem
                        onClick={() => {
                            popover.setIsOpen(false);
                            onChangeCurrency(undefined);
                        }}
                    >
                        <TransactionTableMixedTypography variant="body1">(mixed)</TransactionTableMixedTypography>
                    </MenuItem>
                ) : undefined}
                {currencies.map((currency) => (
                    <MenuItem
                        key={currency.id}
                        onClick={() => {
                            popover.setIsOpen(false);
                            onChangeCurrency(currency.id);
                        }}
                    >
                        {getCurrencyIconSx(currency, CurrencyIconSx)}
                        <Typography variant="body1">{currency.name}</Typography>
                    </MenuItem>
                ))}
            </Menu>
        </CurrencyContainerBox>
    );
};

const CurrencyContainerBox = styled(Box)({ display: "flex", alignItems: "center" });
const CurrencyIconMixedHelpIcon = styled(Help)(TransactionTableSxProps.Mixed);
const CurrencyInputTextField = styled(TextField)({
    [`& .${inputBaseClasses.adornedStart}`]: {
        paddingLeft: 3,
        paddingRight: 5,

        [`& .${inputAdornmentClasses.positionStart}`]: {
            marginRight: 3,
        },
    },

    [`& .${inputAdornmentClasses.positionStart} button`]: {
        minWidth: "inherit",
        padding: "1px 3px 0 3px",

        color: Greys[500],
        fontWeight: 400,
        width: 38,
    },
    [`& .${inputAdornmentClasses.positionEnd} button`]: {
        padding: 2,
        color: Greys[500],
    },
});
const CurrencyIconSx = { height: 20, width: 20, borderRadius: "4px", marginRight: 10 };

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
    const updateValue = useMemo(() => handleTextFieldChange((value) => onChange(value ? value : null)), [onChange]);
    const clearValue = useCallback(() => onChange(), [onChange]);

    return (
        <TextField
            size="small"
            variant="outlined"
            placeholder={value === undefined ? "(mixed)" : placeholder || "(none)"}
            value={value || ""}
            onChange={updateValue}
            InputProps={{
                endAdornment:
                    allowUndefined && value !== undefined ? (
                        <InputAdornment position="end">
                            <IconButton size="small" onClick={clearValue}>
                                <Clear fontSize="small" />
                            </IconButton>
                        </InputAdornment>
                    ) : undefined,
            }}
            inputProps={{
                sx: (allowUndefined ? value === undefined : placeholder === undefined)
                    ? TransactionTableSxProps.MixedPlaceholder
                    : TransactionTableSxProps.BasePlaceholder,
            }}
        />
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

const ObjectDropdownButtonSx = {
    width: "100%",
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    textTransform: "inherit",
    color: "inherit",
} as const;
const ObjectDropdownLabelTypography = styled(Typography)({
    flexGrow: 1,
    textAlign: "left",
    overflow: "visible",
});

interface TransactionsTableObjectDropdownProps<T extends { id: ID; name: string }> {
    options: T[];
    selected: ID | undefined;
    select: (id: ID | undefined) => void;
    getIcon: (option: T, sx: SxProps) => React.ReactNode;
    iconSx: SxProps;
    allowUndefined?: boolean;
    button?: ObjectSelectorCommonProps<T>["children"];
    getMenuContents?: (close: () => void) => React.ReactNode;
    MenuProps?: Partial<MenuProps>;
}
export const TransactionsTableObjectDropdown = <T extends { id: ID; name: string }>({
    options,
    selected,
    select,
    getIcon,
    iconSx,
    allowUndefined,
    button,
    getMenuContents,
    MenuProps = { PaperProps: { style: { maxHeight: 170 } } },
}: TransactionsTableObjectDropdownProps<T>) => {
    const option = options.find(({ id }) => id === selected);

    return (
        <ObjectSelector
            options={options}
            render={(option) => getIcon(option, iconSx)}
            MenuProps={MenuProps}
            getMenuContents={getMenuContents}
            selected={selected}
            setSelected={select}
            placeholder={
                allowUndefined ? (
                    <>
                        <Box sx={iconSx} />
                        <TransactionTableMixedTypography>(mixed)</TransactionTableMixedTypography>
                    </>
                ) : undefined
            }
        >
            {button || (
                <Button sx={ObjectDropdownButtonSx} variant="outlined" component="div" color="inherit">
                    {option && getIcon(option, iconSx)}
                    <ObjectDropdownLabelTypography
                        variant="body1"
                        sx={option ? undefined : TransactionTableSxProps.Mixed}
                        noWrap={true}
                    >
                        {option?.name || "(mixed)"}
                    </ObjectDropdownLabelTypography>
                </Button>
            )}
        </ObjectSelector>
    );
};
