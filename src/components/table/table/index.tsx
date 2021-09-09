import { Button, Card, Checkbox } from "@material-ui/core";
import { PlaylistAdd } from "@material-ui/icons";
import clsx from "clsx";
import React, { useCallback } from "react";
import { TableContainer, TableHeaderContainer } from "..";
import { TopHatDispatch, TopHatStore } from "../../../state";
import { AppSlice } from "../../../state/app";
import {
    EditTransactionState,
    TransactionsTableEditState,
    TransactionsTableFilterState,
} from "../../../state/app/pageTypes";
import { ID } from "../../../state/utilities/values";
import { flipListIncludes } from "../../../utilities/data";
import { getAllCommonTransactionValues, TransactionsTableFixedData, useTransactionsTableData } from "./data";
import { TransactionsTableEditEntry } from "./edit";
import { TransactionsTableHeader } from "./header";
import { useTransactionsTableStyles } from "./styles";
import { TransactionsTableViewEntry } from "./view";

export interface TransactionsTableProps {
    filters: TransactionsTableFilterState;
    state: TransactionsTableEditState;
    setFilterPartial: (filter: Partial<TransactionsTableFilterState>) => void;
    fixed?: TransactionsTableFixedData;
}

// This table assumes that the current state.app.page extends TransactionsTableEditState
export const TransactionsTable: React.FC<TransactionsTableProps> = ({
    filters,
    state: { selection, edit },
    setFilterPartial,
    fixed,
}) => {
    const classes = useTransactionsTableStyles();
    const { ids, groups, metadata } = useTransactionsTableData(filters);

    const loadMoreTransactions = useCallback(
        () => setFilterPartial({ tableLimit: filters.tableLimit + Math.min(100, filters.tableLimit) }),
        [filters.tableLimit, setFilterPartial]
    );

    return (
        <TableContainer title="Transaction List">
            <TableHeaderContainer
                className={clsx(classes.container, selection.length > 0 && classes.selectedHeaderContainer)}
            >
                <div className={classes.checkbox}>
                    <Checkbox
                        indeterminate={!!selection.length && selection.length !== ids.length}
                        checked={!!selection.length}
                        onChange={toggleSelectionHeader(ids)}
                        color="primary"
                        disabled={!!edit}
                    />
                </div>
                {edit && edit.id === undefined ? (
                    <TransactionsTableEditEntry
                        original={getAllCommonTransactionValues(selection.map((id) => metadata[id]!))}
                        edit={edit}
                        ids={selection}
                        setEditPartial={setEditStatePartial}
                        fixed={fixed}
                    />
                ) : selection.length ? (
                    <TransactionsTableViewEntry
                        transaction={getAllCommonTransactionValues(selection.map((id) => metadata[id]!))}
                        updateState={updateTableState}
                        fixed={fixed}
                    />
                ) : (
                    <TransactionsTableHeader filters={filters} updateFilters={setFilterPartial} fixed={fixed} />
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
                                <TransactionsTableEditEntry
                                    original={metadata[id]!}
                                    edit={edit}
                                    ids={[id]}
                                    setEditPartial={setEditStatePartial}
                                    fixed={fixed}
                                />
                            ) : (
                                <TransactionsTableViewEntry
                                    transaction={metadata[id]!}
                                    updateState={updateTableState}
                                    fixed={fixed}
                                />
                            )}
                        </div>
                    ))}
                </Card>
            ))}
            <Button
                variant="outlined"
                size="large"
                onClick={loadMoreTransactions}
                className={classes.loadMoreTransactionsButton}
                endIcon={<PlaylistAdd />}
            >
                Load More
            </Button>
        </TableContainer>
    );
};

const getEditState = () => TopHatStore.getState().app.page as TransactionsTableEditState;
const setSelection = (selection: ID[]) =>
    TopHatDispatch(AppSlice.actions.setTransactionTableStatePartial({ selection }));
const toggleSelection = (id: ID) => () => setSelection(flipListIncludes(id, getEditState().selection));
const toggleSelectionHeader = (ids: ID[]) => () => setSelection(getEditState().selection.length > 0 ? [] : ids);

const updateTableState = (update: Partial<TransactionsTableEditState>) =>
    TopHatDispatch(AppSlice.actions.setTransactionTableStatePartial(update));

const setEditStatePartial = (update: Partial<EditTransactionState> | null) =>
    TopHatDispatch(
        AppSlice.actions.setTransactionTableStatePartial({
            edit: update ? { ...getEditState().edit!, ...update } : undefined,
        })
    );
