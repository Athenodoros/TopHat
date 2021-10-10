import { Tooltip, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import clsx from "clsx";
import React from "react";
import { Greys } from "../../styles/colours";

const useEditValueContainerStyles = makeStyles({
    outer: {
        margin: "15px 0",
        "&:first-child": { marginTop: 10 },
        "&:last-child": { marginBottom: 10 },
    },
    container: {
        display: "flex",
        alignItems: "center",
    },
    labelContainer: {
        flex: "0 0 150px",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        paddingRight: "30px",
    },
    label: {
        color: Greys[600],
        textTransform: "uppercase",
    },
    title: {
        color: Greys[600],
        textTransform: "uppercase",
        marginTop: 20,
    },
    disabled: {
        pointerEvents: "none",
        opacity: 0.3,
    },
});
export const EditValueContainer: React.FC<{ label?: React.ReactNode; className?: string; disabled?: string }> = ({
    label,
    children,
    className,
    disabled,
}) => {
    const classes = useEditValueContainerStyles();

    return (
        <Tooltip title={disabled || ""}>
            <div className={classes.outer}>
                <div className={clsx(classes.container, disabled && classes.disabled, className)}>
                    <div className={classes.labelContainer}>
                        {typeof label === "string" ? (
                            <Typography variant="subtitle2" noWrap={true} className={classes.label}>
                                {label}
                            </Typography>
                        ) : (
                            label
                        )}
                    </div>
                    {children}
                </div>
            </div>
        </Tooltip>
    );
};

export const EditTitleContainer: React.FC<{ title: string }> = ({ title }) => (
    <EditValueContainer label="" className={useEditValueContainerStyles().title}>
        <Typography variant="overline">{title}</Typography>
    </EditValueContainer>
);

const useDividerStyles = makeStyles({
    divider: { flex: "0 0 1px", width: "80%", background: Greys[400], alignSelf: "left", margin: "10px 25px" },
});
export const EditDivider: React.FC = () => <div className={useDividerStyles().divider} />;
