import { makeStyles, Typography } from "@material-ui/core";
import { AccountBalanceWalletTwoTone, PaymentTwoTone, ShoppingBasketTwoTone } from "@material-ui/icons";
import React from "react";
import { shallowEqual } from "react-redux";
import { Section } from "../../components/layout";
import { useSelector } from "../../state/utilities/hooks";
import { AppColours } from "../../styles/colours";
import { zipObject } from "../../utilities/data";

const useMainStyles = makeStyles({
    storedDataEntry: {
        display: "flex",
        padding: 10,

        "& > svg:first-child": {
            marginTop: 3,
        },
    },
});

const fields = ["account", "institution", "category", "currency", "rule", "transaction"] as const;

export const DataCountsDisplay: React.FC = () => {
    const classes = useMainStyles();

    const counts = useSelector(
        (state) =>
            zipObject(
                fields,
                fields.map((f) => state.data[f].ids.length)
            ),
        shallowEqual
    );

    return (
        <Section title="Stored Data">
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
        </Section>
    );
};

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
