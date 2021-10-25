import { DatePicker, DatePickerProps } from "@mui/lab";
import { Checkbox, FormControlLabel } from "@mui/material";
import { SxProps } from "@mui/system";
import { noop } from "lodash";
import { DateTime } from "luxon";
import { useCallback, useEffect, useState } from "react";
import { formatDate, getToday, parseDate, SDate } from "../../state/shared/values";

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
    renderInput,
    maxDate,
    minDate,
    disableFuture,
    disablePast,
    ...props
}: Omit<DatePickerProps, "value" | "onChange"> & {
    value: Nullable extends true ? SDate | undefined : SDate;
    onChange: (value: Nullable extends true ? SDate | undefined : SDate) => void;
    nullable: Nullable;
}) => {
    const [value, setValue] = useState<DateTime | null>(parseDate(initial) || null);
    useEffect(() => setValue(parseDate(initial || null)), [initial]);

    const onChangeHandler = useCallback<DatePickerProps["onChange"]>(
        // Either called with null (empty), an invalid DateTime, or a valid DateTime
        (newValue: unknown, text?: string) => {
            setValue(newValue as DateTime | null);

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
    const renderInputWrapped = useCallback<DatePickerProps["renderInput"]>(
        (params) =>
            renderInput({
                ...params,
                error: (value === null && nullable === false) || (value && !value.isValid) || params.error,
            }),
        [renderInput, nullable, value]
    );

    return (
        <DatePicker
            inputFormat="yyyy-MM-dd"
            mask="____-__-__"
            value={value}
            onChange={onChangeHandler}
            allowSameDateSelection={true}
            minDate={minDate}
            maxDate={maxDate}
            disableFuture={disableFuture}
            disablePast={disablePast}
            {...props}
            renderInput={renderInputWrapped}
        />
    );
};
