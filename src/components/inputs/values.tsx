import { Checkbox, FormControlLabel, makeStyles } from "@material-ui/core";
import clsx from "clsx";

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
}
export const SubItemCheckbox: React.FC<SubItemCheckboxProps> = ({ label, checked, setChecked, left, className }) => {
    const classes = useStyles();

    return (
        <FormControlLabel
            className={clsx(classes.base, left ? classes.left : classes.right, className)}
            control={<Checkbox color="primary" size="small" checked={checked} />}
            label={label}
            labelPlacement={left ? "end" : "start"}
            style={{
                opacity: checked ? undefined : 0.5,
            }}
            onClick={() => setChecked(!checked)}
        />
    );
};