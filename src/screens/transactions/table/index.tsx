import { Card, makeStyles } from "@material-ui/core";
import React from "react";
import { TableContainer } from "../../../components/table";
import { useTransactionsTableData } from "./data";
import { TransactionsTableHeader } from "./header";
import { TransactionsTableEntry } from "./transaction";

const useStyles = makeStyles({
    day: {
        marginTop: 20,
        borderRadius: 10,
        padding: 0,
    },
});

export const TransactionsTable: React.FC = () => {
    const classes = useStyles();
    const dailyTransactionLists = useTransactionsTableData();

    return (
        <TableContainer title="Transaction List">
            <TransactionsTableHeader />
            {dailyTransactionLists.map(([date, list]) => (
                <Card className={classes.day} key={date} elevation={0}>
                    {list.map((id) => (
                        <TransactionsTableEntry id={id} key={id} />
                    ))}
                </Card>
            ))}
        </TableContainer>
    );
};
