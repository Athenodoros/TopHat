import { AccountBalanceWalletTwoTone, PaymentTwoTone, ShoppingBasketTwoTone } from "@mui/icons-material";
import { Link, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { DateTime } from "luxon";
import React from "react";
import { shallowEqual } from "react-redux";
import { zipObject } from "../../shared/data";
import { TopHatDispatch } from "../../state";
import { AppSlice } from "../../state/app";
import { useUserData } from "../../state/data/hooks";
import { useSelector } from "../../state/shared/hooks";
import { parseDate } from "../../state/shared/values";
import { AppColours, Greys } from "../../styles/colours";
import { SettingsDialogContents, SettingsDialogDivider, SettingsDialogPage } from "./shared";

const useStyles = makeStyles({
    text: {
        // marginBottom: 30,
    },
    storedDataEntry: {
        display: "flex",
        padding: 10,

        "& > svg": {
            marginTop: 3,
        },
    },
    divider: {
        background: Greys[300],
        height: 1,
        width: "60%",
        margin: "20px auto 30px auto",
    },
    button: {
        float: "right",
        marginBottom: 10,
    },
    demo2: {
        margin: "15px 0",
    },
});
const fields = ["account", "institution", "category", "currency", "rule", "transaction", "statement"] as const;
export const DialogSummaryContents: React.FC = () => {
    const classes = useStyles();
    const start = parseDate(useUserData((user) => user.start)).toLocaleString(DateTime.DATE_FULL);
    const isDemo = useUserData((user) => user.isDemo);

    const counts = useSelector(
        (state) =>
            zipObject(
                fields,
                fields.map((f) => state.data[f].ids.length)
            ),
        shallowEqual
    );

    const intro = isDemo ? (
        <>
            This is a demo instance of TopHat, initialised on {start}. To start a real instance or restart the demo, go
            to{" "}
            <Link onClick={goToImportDataPage} href="#" underline="hover">
                Import and Wipe Data
            </Link>
            . Currently, it contains the following data:
        </>
    ) : (
        `This instance of TopHat was initialised on ${start}. It contains the following data:`
    );

    return (
        <SettingsDialogPage title={isDemo ? "Demo Data Summary" : "Data Summary"}>
            <Typography variant="body2" className={classes.text}>
                {intro}
            </Typography>
            <SettingsDialogDivider />
            <SettingsDialogContents>
                <div className={classes.storedDataEntry}>
                    <AccountBalanceWalletTwoTone style={{ color: AppColours.accounts.main }} />
                    <Table
                        points={[
                            ["Accounts", counts.account],
                            ["Institutions", counts.institution - 1],
                            ["Statements", counts.statement - 1],
                        ]}
                    />
                </div>
                <div className={classes.storedDataEntry}>
                    <PaymentTwoTone style={{ color: AppColours.transactions.main }} />
                    <Table
                        points={[
                            ["Transactions", counts.transaction],
                            ["Rules", counts.rule],
                            ["Currencies", counts.currency],
                        ]}
                    />
                </div>
                <div className={classes.storedDataEntry}>
                    <ShoppingBasketTwoTone style={{ color: AppColours.categories.main }} />
                    <Table points={[["Categories", counts.category - 2]]} />
                </div>
            </SettingsDialogContents>
        </SettingsDialogPage>
    );
};

const goToImportDataPage = () => TopHatDispatch(AppSlice.actions.setDialogPartial({ settings: "import" }));

const useTableStyles = makeStyles({
    container: {
        marginLeft: 20,
        marginRight: 10,
        marginTop: 3,
        flexGrow: 1,

        display: "flex",
        flexDirection: "column",
    },
    row: {
        display: "flex",
        justifyContent: "space-between",
    },
});
export const Table: React.FC<{ points: [string, number][] }> = ({ points }) => {
    const classes = useTableStyles();

    return (
        <div className={classes.container}>
            {points.map(([label, value], idx) => (
                <div key={idx} className={classes.row}>
                    <Typography variant={idx ? "body2" : "body1"} sx={idx ? undefined : { fontWeight: 500 }}>
                        {label}
                    </Typography>
                    <Typography variant={idx ? "body2" : "body1"} sx={idx ? undefined : { fontWeight: 500 }}>
                        {value}
                    </Typography>
                </div>
            ))}
        </div>
    );
};
