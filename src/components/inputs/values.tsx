import { DatePicker, DatePickerProps } from "@mui/lab";
import { Checkbox, ClickAwayListener, FormControlLabel } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import clsx from "clsx";
import { noop } from "lodash";
import { useCallback, useState } from "react";

const useStyles = makeStyles({
    base: {
        flexGrow: 0,
        transform: "scale(0.8)",
        height: 24,

        "&:hover": {
            opacity: "1 !important",
        },
    },
    left: {
        transformOrigin: "center left",
    },
    right: {
        transformOrigin: "center right",
    },
});

interface SubItemCheckboxProps {
    label: string;
    checked: boolean;
    setChecked: (value: boolean) => void;
    left?: boolean;
    className?: string;
    disabled?: boolean;
}
export const SubItemCheckbox: React.FC<SubItemCheckboxProps> = ({
    label,
    checked,
    setChecked,
    left,
    className,
    disabled,
}) => {
    const classes = useStyles();

    return (
        <FormControlLabel
            className={clsx(classes.base, left ? classes.left : classes.right, className)}
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
            style={{
                opacity: checked || disabled ? undefined : 0.5,
            }}
            disabled={disabled}
        />
    );
};

const useDatePickerStyles = makeStyles({
    picker: {
        "& .PrivatePickersSlideTransition-root": {
            minHeight: 246,
        },
    },
});
export const AutoClosingDatePicker: React.FC<Omit<DatePickerProps, "open" | "onClose" | "onOpen">> = (props) => {
    const classes = useDatePickerStyles();

    const [isOpen, setIsOpen] = useState(false);
    const handleOpen = useCallback(() => setIsOpen(true), []);
    const handleClose = useCallback(() => setIsOpen(false), []);

    return (
        <ClickAwayListener mouseEvent="onMouseUp" onClickAway={handleClose}>
            <div>
                <DatePicker
                    allowSameDateSelection={true}
                    {...props}
                    open={isOpen}
                    onClose={handleClose}
                    onOpen={handleOpen}
                    PopperProps={{
                        ...props.PopperProps,
                        className: clsx(classes.picker, props.PopperProps?.className),
                    }}
                />
            </div>
        </ClickAwayListener>
    );
};
