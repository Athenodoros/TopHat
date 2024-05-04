import { Checkbox, FormControlLabel } from "@mui/material";
import { SxProps } from "@mui/system";
import { DatePicker, DatePickerProps } from "@mui/x-date-pickers";
import { noop } from "lodash";
import { DateTime } from "luxon";
import { useCallback, useEffect, useState } from "react";
import { SDate, formatDate, getToday, parseDate } from "../../state/shared/values";

interface SubItemCheckboxProps {
    label: string;
    checked: boolean;
    setChecked: (value: boolean) => void;
    left?: boolean;
    sx?: SxProps;
    disabled?: boolean;
}
export const SubItemCheckbox: React.FC<SubItemCheckboxProps> = ({ label, checked, setChecked, left, sx, disabled }) => (
    <FormControlLabel
        sx={{
            flexGrow: 0,
            transform: "scale(0.8)",
            height: 24,
            transformOrigin: "center " + (left ? "left" : "right"),
            opacity: checked || disabled ? undefined : 0.5,

            "&:hover": {
                opacity: "1 !important",
            },

            ...sx,
        }}
        control={
            <Checkbox
                color="primary"
                size="small"
                checked={checked}
                onClick={disabled ? noop : () => setChecked(!checked)}
            />
        }
        label={label}
        labelPlacement={left ? "end" : "start"}
        disabled={disabled}
    />
);

export const ManagedDatePicker = <Nullable extends boolean>({
    value: initial,
    onChange,
    nullable,
    maxDate,
    minDate,
    disableFuture,
    disablePast,
    ...props
}: Omit<DatePickerProps<DateTime<boolean>>, "value" | "onChange"> & {
    value: Nullable extends true ? SDate | undefined : SDate;
    onChange: (value: Nullable extends true ? SDate | undefined : SDate) => void;
    nullable: Nullable;
}) => {
    const [value, setValue] = useState<DateTime | null>(parseDate(initial) || null);
    useEffect(() => setValue(parseDate(initial || null)), [initial]);

    const onChangeHandler = useCallback<NonNullable<DatePickerProps<DateTime<boolean>>["onChange"]>>(
        // Either called with null (empty), an invalid DateTime, or a valid DateTime
        (newValue: DateTime<boolean> | null, _context: any) => {
            setValue(newValue);

            if (nullable && newValue === null) return (onChange as any)(undefined);
            if (
                newValue &&
                (newValue as DateTime).isValid &&
                (!minDate || (minDate as DateTime) <= (newValue as DateTime)) &&
                (!maxDate || (maxDate as DateTime) >= (newValue as DateTime)) &&
                (!disableFuture || (newValue as DateTime) <= getToday()) &&
                (!disablePast || (newValue as DateTime) >= getToday())
            )
                return onChange(formatDate(newValue as DateTime));
        },
        [nullable, onChange, minDate, maxDate, disableFuture, disablePast]
    );

    return (
        <DatePicker
            format="yyyy-MM-dd"
            value={value}
            onChange={onChangeHandler}
            minDate={minDate}
            maxDate={maxDate}
            disableFuture={disableFuture}
            disablePast={disablePast}
            {...props}
            slotProps={{
                ...props.slotProps,
                textField: {
                    ...props.slotProps?.textField,
                    ...((value === null && nullable === false) || (value && !value.isValid) ? { error: true } : {}),
                },
            }}
        />
    );
};
