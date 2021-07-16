import { Avatar, Button, Card, makeStyles, Typography } from "@material-ui/core";
import { AccountBalance } from "@material-ui/icons";
import clsx from "clsx";
import React from "react";
import { PLACEHOLDER_INSTITUTION_ID } from "../../../state/data";
import { Greys } from "../../../styles/colours";
import { AccountTableEntry } from "./account";
import { AccountsInstitutionSummary } from "./data";
import { useAccountsTableStyles } from "./styles";

const useStyles = makeStyles({
    container: {
        display: "flex",
        alignItems: "flex-start",
        position: "relative",
        marginTop: 27,
    },

    institutionColourSquare: {
        position: "absolute",
        width: 320,
        height: 280,
        left: -37.66,
        top: -86.53,
        opacity: 0.1,
        borderRadius: 48,
        transform: "rotate(-60deg)",
    },
    institutionName: {
        lineHeight: 1,
        marginTop: 2,
        width: "100%",
    },
    placeholder: {
        fontStyle: "italic",
        color: Greys[500],
    },
    institutionEditAction: {
        color: Greys[600],
        height: 20,
        minWidth: 40,
        marginTop: 2,
        marginLeft: -5,
    },
});

export const AccountsInstitutionDisplay: React.FC<{ institution: AccountsInstitutionSummary }> = ({ institution }) => {
    const accountsTableClasses = useAccountsTableStyles();
    const classes = useStyles();

    return (
        <Card className={classes.container}>
            <Avatar src={institution?.icon} className={accountsTableClasses.icon}>
                <AccountBalance style={{ height: "50%" }} />
            </Avatar>
            <div className={accountsTableClasses.institution}>
                <Typography
                    variant="h5"
                    className={clsx(
                        classes.institutionName,
                        institution.id === PLACEHOLDER_INSTITUTION_ID ? classes.placeholder : undefined
                    )}
                    noWrap={true}
                >
                    {institution.name}
                </Typography>
                <Button
                    size="small"
                    className={classes.institutionEditAction}
                    disabled={institution.id === PLACEHOLDER_INSTITUTION_ID}
                >
                    EDIT
                </Button>
            </div>
            <div className={classes.institutionColourSquare} style={{ backgroundColor: institution.colour }} />
            <div className={accountsTableClasses.accounts}>
                {institution.accounts.map((account) => (
                    <AccountTableEntry account={account} key={account.id} />
                ))}
            </div>
        </Card>
    );
};
