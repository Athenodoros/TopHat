import { Link, makeStyles, Typography } from "@material-ui/core";
import { AccountBalanceWalletTwoTone, PaymentTwoTone, ShoppingBasketTwoTone } from "@material-ui/icons";
import { DateTime } from "luxon";
import React from "react";
import { shallowEqual } from "react-redux";
import { TopHatDispatch } from "../../../state";
import { AppSlice } from "../../../state/app";
import { useSelector } from "../../../state/utilities/hooks";
import { parseDate } from "../../../state/utilities/values";
import { AppColours, Greys } from "../../../styles/colours";
import { zipObject } from "../../../utilities/data";

const useStyles = makeStyles({
    container: {
        width: 450,
        margin: "40px auto",
    },
    text: {
        marginBottom: 30,
    },
    storedDataEntry: {
        display: "flex",
        padding: 10,

        "& > svg:first-child": {
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
    const start = parseDate(useSelector((state) => state.data.user.start)).toLocaleString(DateTime.DATE_FULL);
    const isDemo = useSelector((state) => state.data.user.isDemo);

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
            <Link onClick={goToImportDataPage} href="#">
                Import and Wipe Data
            </Link>
            . Currently, it contains the following data:
        </>
    ) : (
        `This instance of TopHat was initialised on ${start}. It contains the following data:`
    );

    return (
        <div className={classes.container}>
            <Typography variant="body2" className={classes.text}>
                {intro}
            </Typography>
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
        </div>
    );
};

const goToImportDataPage = () => TopHatDispatch(AppSlice.actions.setDialogPartial({ settings: "import" }));

const useTableStyles = makeStyles({
    container: {
        marginLeft: 20,
        marginRight: 10,
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
                    <Typography variant={idx ? "body1" : "h6"}>{label}</Typography>
                    <Typography variant={idx ? "body1" : "h6"}>{value}</Typography>
                </div>
            ))}
        </div>
    );
};
