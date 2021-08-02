import { makeStyles, Typography } from "@material-ui/core";
import clsx from "clsx";
import React from "react";
import { Greys } from "../../../styles/colours";

const useEditValueContainerStyles = makeStyles({
    container: {
        display: "flex",
        alignItems: "center",
        margin: "15px 0",

        "&:first-child": { marginTop: 10 },
        "&:last-child": { marginBottom: 10 },
    },
    label: {
        flex: "0 0 150px",
        textAlign: "right",
        paddingRight: 30,
        color: Greys[600],
        textTransform: "uppercase",
    },
    title: {
        color: Greys[600],
        textTransform: "uppercase",
        marginTop: 20,
    },
});
export const EditValueContainer: React.FC<{ label: string; className?: string }> = ({ label, children, className }) => {
    const classes = useEditValueContainerStyles();

    return (
        <div className={clsx(classes.container, className)}>
            <Typography variant="subtitle2" noWrap={true} className={classes.label}>
                {label}
            </Typography>
            {children}
        </div>
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
