import { Checkbox, FormControlLabel, makeStyles } from "@material-ui/core";
import clsx from "clsx";
import { noop } from "lodash";

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
