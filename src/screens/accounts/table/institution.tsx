import { Button, Card, makeStyles, Typography } from "@material-ui/core";
import clsx from "clsx";
import React from "react";
import { Greys } from "../../../styles/colours";
import { AccountTableEntry } from "./account";
import { AccountsInstitutionSummary } from "./data";

export const ICON_MARGIN_LEFT = 27;
export const ICON_WIDTH = 40;
export const ICON_MARGIN_RIGHT = 17;
export const INSTITUTION_WIDTH = 400;

const useStyles = makeStyles((theme) => ({
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
    institutionSummary: {
        display: "flex",
        alignItems: "center",
        width: INSTITUTION_WIDTH,
        height: 100,
        flexShrink: 0,
    },
    institutionImage: {
        height: ICON_WIDTH,
        width: ICON_WIDTH,
        margin: `29px ${ICON_MARGIN_RIGHT}px 29px ${ICON_MARGIN_LEFT}px`,
        borderRadius: 5,
    },
    institutionImagePlaceholder: {
        backgroundColor: Greys[200],
    },
    institutionNameContainer: {
        flexGrow: 0,
    },
    institutionName: {
        lineHeight: 1,
        marginTop: 2,
    },
    missingInstitutionName: {
        fontStyle: "italics",
        color: Greys[700],
    },
    institutionEditAction: {
        color: Greys[600],
        height: 20,
        minWidth: 40,
        marginTop: 2,
        marginLeft: -5,
    },

    accounts: {
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        margin: "16px 50px 16px 0",
        flexGrow: 1,
    },
}));

export const AccountsInstitutionDisplay: React.FC<{ institution: AccountsInstitutionSummary }> = ({ institution }) => {
    const classes = useStyles();

    return (
        <Card className={classes.container}>
            <div
                className={classes.institutionColourSquare}
                style={{ backgroundColor: institution.colour || Greys[700] }}
            />
            <div className={classes.institutionSummary}>
                {institution.icon ? (
                    <img src={institution.icon} className={classes.institutionImage} alt={institution.name} />
                ) : (
                    <div className={clsx(classes.institutionImage, classes.institutionImagePlaceholder)} />
                )}
                <div className={classes.institutionNameContainer}>
                    <Typography
                        variant="h5"
                        className={clsx(
                            classes.institutionName,
                            institution.name ? undefined : classes.missingInstitutionName
                        )}
                    >
                        {institution.name || "No Institution"}
                    </Typography>
                    <Button
                        size="small"
                        className={classes.institutionEditAction}
                        disabled={institution.id === undefined}
                    >
                        EDIT
                    </Button>
                </div>
            </div>
            <div className={classes.accounts}>
                {institution.accounts.map((account) => (
                    <AccountTableEntry account={account} key={account.id} />
                ))}
            </div>
        </Card>
    );
};
