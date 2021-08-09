import { Button, makeStyles, Typography } from "@material-ui/core";
import { KeyboardArrowDown } from "@material-ui/icons";
import React from "react";
import { useDialogState } from "../../../state/app/hooks";
import { useAllAccounts } from "../../../state/data/hooks";
import { changeStatementDialogAccount } from "../../../state/logic/statement";
import { Greys, WHITE } from "../../../styles/colours";
import { useGetAccountIcon } from "../../display/ObjectDisplay";
import { ObjectSelector } from "../../inputs";

const useStyles = makeStyles({
    icon: {
        height: 20,
        width: 20,
        borderRadius: 4,
        marginRight: 15,
    },
    accountContainer: {
        margin: "12px 20px",
    },
    account: {
        height: 40,
        width: "100%",
        textTransform: "inherit",
        background: WHITE,
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
    const classes = useStyles();

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
                    color={account === undefined ? "secondary" : "primary"}
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
