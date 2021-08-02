import { Button, Link, makeStyles, Typography } from "@material-ui/core";
import { AccountBalanceWalletTwoTone, PaymentTwoTone, ShoppingBasketTwoTone } from "@material-ui/icons";
import React from "react";
import { shallowEqual } from "react-redux";
import { TopHatDispatch } from "../../../state";
import { AppSlice } from "../../../state/app";
import { DemoStatementFile } from "../../../state/data/demo";
import { useSelector } from "../../../state/utilities/hooks";
import { AppColours, Greys } from "../../../styles/colours";
import { createAndDownloadFile, zipObject } from "../../../utilities/data";

const useStyles = makeStyles({
    container: {
        width: 450,
        margin: "auto",
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
const fields = ["account", "institution", "category", "currency", "rule", "transaction"] as const;
export const DialogSummaryContents: React.FC = () => {
    const classes = useStyles();
    const isDemo = useSelector((state) => state.data.user.isDemo);

    const counts = useSelector(
        (state) =>
            zipObject(
                fields,
                fields.map((f) => state.data[f].ids.length)
            ),
        shallowEqual
    );

    return (
        <div className={classes.container}>
            <div className={classes.storedDataEntry}>
                <AccountBalanceWalletTwoTone style={{ color: AppColours.accounts.main }} />
                <Table
                    points={[
                        ["Accounts", counts.account],
                        ["Institutions", counts.institution - 1],
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
                <Table points={[["Categories", counts.category - 1]]} />
            </div>
            {isDemo ? (
                <>
                    <div className={classes.divider} />
                    <Typography variant="body2">
                        This is a demo instance of TopHat. To start again from scratch, go to{" "}
                        <Link onClick={goToImportDataPage} href="#">
                            Import and Wipe Data
                        </Link>
                        .
                    </Typography>
                    <Typography variant="body2" className={classes.demo2}>
                        One thing you might want to try in the demo is the statement upload functionality: you can click
                        the button to download a test statement which the demo can import.
                    </Typography>
                    <Button
                        variant="outlined"
                        className={classes.button}
                        color="primary"
                        onClick={createStatementDownload}
                    >
                        Download Statement
                    </Button>
                </>
            ) : undefined}
        </div>
    );
};

const createStatementDownload = () => createAndDownloadFile(DemoStatementFile.name, DemoStatementFile.contents);
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
