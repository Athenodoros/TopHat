import { Card, Checkbox } from "@material-ui/core";
import clsx from "clsx";
import { keys, uniqBy } from "lodash";
import React, { useState } from "react";
import { TableContainer, TableHeaderContainer } from "../../../components/table";
import { useTransactionsPageState } from "../../../state/app/hooks";
import { PartialTransaction } from "../../../state/app/types";
import { Transaction } from "../../../state/data";
import { ID } from "../../../state/utilities/values";
import { flipListIncludes, zipObject } from "../../../utilities/data";
import { useTransactionsTableData } from "./data";
import { TransactionsTableHeaderView } from "./headerView";
import { useTransactionsTableStyles } from "./styles";
import { TransactionsTableEditEntry } from "./transactionEdit";
import { TransactionsTableViewEntry } from "./transactionView";

export const TransactionsTable: React.FC = () => {
    const classes = useTransactionsTableStyles();
    const { ids, groups, metadata } = useTransactionsTableData();

    const [selection, setSelection] = useState([] as ID[]);
    const toggleSelection = (id: ID) => () => setSelection(flipListIncludes(id, selection));
    const toggleSelectionHeader = () => setSelection(selection.length > 0 ? [] : ids);

    const edit = useTransactionsPageState((state) => state.edit);

    return (
        <TableContainer title="Transaction List">
            <TableHeaderContainer
                className={clsx(classes.container, selection.length > 0 && classes.selectedHeaderContainer)}
            >
                <div className={classes.checkbox}>
                    <Checkbox
                        indeterminate={!!selection.length && selection.length !== ids.length}
                        checked={!!selection.length}
                        onChange={toggleSelectionHeader}
                        color="primary"
                        disabled={!!edit}
                    />
                </div>
                {selection.length ? (
                    <TransactionsTableViewEntry
                        transaction={getAllCommonValues(selection.map((id) => metadata[id]!))}
                    />
                ) : (
                    <TransactionsTableHeaderView />
                )}
            </TableHeaderContainer>
            {groups.map(([date, list]) => (
                <Card className={classes.rowGroupContainer} key={date} elevation={0}>
                    {list.map((id) => (
                        <div className={clsx(classes.container, classes.rowContainer)} key={id}>
                            <div className={classes.checkbox}>
                                <Checkbox
                                    checked={selection.includes(id)}
                                    onChange={toggleSelection(id)}
                                    color="primary"
                                    disabled={!!edit}
                                />
                            </div>
                            {edit?.id === id ? (
                                <TransactionsTableEditEntry transaction={metadata[id]!} />
                            ) : (
                                <TransactionsTableViewEntry transaction={metadata[id]!} />
                            )}
                        </div>
                    ))}
                </Card>
            ))}
        </TableContainer>
    );
};

const getAllCommonValues = (transactions: Transaction[]) => {
    const dataKeys = keys(transactions[0]).filter((x) => x !== "id") as (keyof Transaction)[];

    return zipObject(
        dataKeys,
        dataKeys.map((key) => {
            const values = uniqBy(transactions, (tx) => tx[key]);
            return values.length === 1 ? values[0][key] : undefined;
        })
    ) as PartialTransaction;
};
