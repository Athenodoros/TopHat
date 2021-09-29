import { KeyboardArrowDown } from "@mui/icons-material";
import { Button, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import clsx from "clsx";
import React from "react";
import { useGetAccountIcon } from "../../components/display/ObjectDisplay";
import { ObjectSelector } from "../../components/inputs";
import { useDialogState } from "../../state/app/hooks";
import { useAllAccounts } from "../../state/data/hooks";
import { changeStatementDialogAccount } from "../../state/logic/statement";
import { Greys } from "../../styles/colours";

const useSelectorStyles = makeStyles({
    icon: {
        height: 20,
        width: 20,
        borderRadius: 4,
        marginRight: 15,
    },
    accountContainer: {
        margin: "12px 15px",
    },
    account: {
        height: 40,
        width: "100%",
        textTransform: "inherit",
        color: "inherit",

        "& .MuiTypography-body1": {
            // color: BLACK,
            flexGrow: 1,
            textAlign: "left",
        },
    },
    placeholder: {
        fontStyle: "italic",
        color: Greys[600],
    },
});

export const DialogImportAccountSelector: React.FC = () => {
    const classes = useSelectorStyles();

    const account = useDialogState("import", (state) => state.account);
    const accounts = useAllAccounts();
    const getAccountIcon = useGetAccountIcon();

    return (
        <ObjectSelector
            options={accounts}
            render={(account) => getAccountIcon(account, classes.icon)}
            selected={account?.id}
            setSelected={changeStatementDialogAccount}
            placeholder={
                <>
                    {getAccountIcon(undefined, classes.icon)}
                    <Typography variant="body1" noWrap={true} className={classes.placeholder}>
                        Enter Account
                    </Typography>
                </>
            }
        >
            <div className={classes.accountContainer}>
                <Button
                    variant="outlined"
                    className={classes.account}
                    color={account === undefined ? "error" : "inherit"}
                >
                    {getAccountIcon(account, classes.icon)}
                    <Typography
                        variant="body1"
                        noWrap={true}
                        className={account === undefined ? classes.placeholder : undefined}
                    >
                        {account?.name || "Enter Account"}
                    </Typography>
                    <KeyboardArrowDown fontSize="small" htmlColor={Greys[600]} />
                </Button>
            </div>
        </ObjectSelector>
    );
};

const useTitleStyles = makeStyles({
    title: {
        color: Greys[900],
        margin: "10px 20px 6px 40px",
        fontWeight: 500,
    },
    divider: {
        height: 1,
        width: "70%",
        marginLeft: 30,
        marginBottom: 10,
        background: Greys[500],
    },
});
export const DialogImportTitle: React.FC<{ title: string }> = ({ title }) => {
    const classes = useTitleStyles();

    return (
        <>
            <Typography variant="h6" className={classes.title}>
                {title}
            </Typography>
            <div className={classes.divider} />
        </>
    );
};

const useButtonStyles = makeStyles({
    container: {
        display: "flex",
        justifyContent: "stretch",
        margin: "auto 15px 12px 15px",

        "& button": { flexGrow: 1 },
        "& > *": {
            flexGrow: 1,
            marginRight: 15,
            "&:last-child": { marginRight: 0 },
        },
    },
});
export const DialogImportButtons: React.FC<{ className?: string }> = ({ children, className }) => {
    const classes = useButtonStyles();

    return <div className={clsx(classes.container, className)}>{children}</div>;
};
