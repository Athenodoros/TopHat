import { PlaylistAdd } from "@mui/icons-material";
import { Button, Card, Checkbox } from "@mui/material";
import clsx from "clsx";
import { noop } from "lodash";
import React, { useCallback, useMemo } from "react";
import { TableHeaderContainer } from "..";
import { flipListIncludes } from "../../../shared/data";
import { useRefToValue } from "../../../shared/hooks";
import { ID } from "../../../state/shared/values";
import { TopHatTheme } from "../../../styles/theme";
import { Section, SectionProps } from "../../layout";
import { getAllCommonTransactionValues, useTransactionsTableData } from "./data";
import { TransactionsTableEditEntry } from "./edit";
import { TransactionsTableHeader } from "./header";
import { TransactionTableSxProps, useTransactionsTableStyles } from "./styles";
import {
    EditTransactionState,
    TransactionsTableFilters,
    TransactionsTableFixedDataState,
    TransactionsTableState,
} from "./types";
import { TransactionsTableViewEntry } from "./view";

export interface TransactionsTableProps {
    filters: TransactionsTableFilters;
    setFilters: (filter: TransactionsTableFilters) => void;

    state: TransactionsTableState;
    setState: (state: TransactionsTableState) => void;

    fixed?: TransactionsTableFixedDataState;

    headers?: SectionProps["headers"];
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({
    filters,
    state,
    fixed,

    setFilters,
    setState,

    headers,
}) => {
    const classes = useTransactionsTableStyles();
    const { selection, edit } = state;
    const { ids, groups, metadata, more } = useTransactionsTableData(filters, fixed);

    const [filtersRef, setFiltersPartial] = useSetPartialValue(filters, setFilters);
    const [stateRef, setStatePartial] = useSetPartialValue(state, setState);
    const updaters = useTableUpdateFunctions(stateRef, setStatePartial, filtersRef, setFiltersPartial);

    return (
        <Section title="Transaction List" headers={headers} emptyBody={true}>
            <TableHeaderContainer
                sx={{
                    ...TransactionTableSxProps.Container,
                    ...(selection.length > 0 ? ActiveTableHeaderContainerSx : undefined),
                }}
            >
                <div className={classes.checkbox}>
                    <Checkbox
                        indeterminate={!!selection.length && selection.length !== ids.length}
                        checked={!!selection.length}
                        onChange={updaters.selectionHeader(ids)}
                        color="primary"
                        disabled={!!edit}
                    />
                </div>
                {edit && edit.id === undefined ? (
                    <TransactionsTableEditEntry
                        original={getAllCommonTransactionValues(selection.map((id) => metadata[id]!))}
                        edit={edit}
                        selected={selection}
                        setEditPartial={updaters.editPartial}
                        setStatePartial={setStatePartial}
                        fixed={fixed}
                    />
                ) : selection.length ? (
                    <TransactionsTableViewEntry
                        transaction={getAllCommonTransactionValues(selection.map((id) => metadata[id]!))}
                        updateState={setStatePartial}
                        fixed={fixed}
                    />
                ) : (
                    <TransactionsTableHeader
                        filters={filters}
                        setFiltersPartial={setFiltersPartial}
                        setEdit={updaters.edit}
                        fixed={fixed}
                        canCreateNew={!edit && selection.length === 0}
                    />
                )}
            </TableHeaderContainer>
            {edit?.id !== undefined && !ids.includes(edit.id) ? (
                <Card className={classes.rowGroupContainer} elevation={0}>
                    <div className={clsx(classes.container, classes.rowContainer)}>
                        <div className={classes.checkbox}>
                            <Checkbox checked={false} onChange={noop} color="primary" disabled={true} />
                        </div>
                        <TransactionsTableEditEntry
                            edit={edit}
                            selected={[edit.id]}
                            setEditPartial={updaters.editPartial}
                            setStatePartial={setStatePartial}
                            fixed={fixed}
                        />
                    </div>
                </Card>
            ) : undefined}
            {groups.map(([date, list]) => (
                <Card className={classes.rowGroupContainer} key={date} elevation={0}>
                    {list.map((id) => (
                        <div className={clsx(classes.container, classes.rowContainer)} key={id}>
                            <div className={classes.checkbox}>
                                <Checkbox
                                    checked={selection.includes(id)}
                                    onChange={updaters.selection(id)}
                                    color="primary"
                                    disabled={!!edit}
                                />
                            </div>
                            {edit?.id === id ? (
                                <TransactionsTableEditEntry
                                    original={metadata[id]!}
                                    edit={edit}
                                    selected={[id]}
                                    setEditPartial={updaters.editPartial}
                                    setStatePartial={setStatePartial}
                                    fixed={fixed}
                                />
                            ) : (
                                <TransactionsTableViewEntry
                                    transaction={metadata[id]!}
                                    updateState={setStatePartial}
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
                onClick={updaters.loadMore}
                className={classes.loadMoreTransactionsButton}
                endIcon={<PlaylistAdd />}
                disabled={!more}
            >
                Load More
            </Button>
        </Section>
    );
};

const useSetPartialValue = <T,>(current: T, setValue: (t: T) => void) => {
    const ref = useRefToValue(current);
    const setPartial = useCallback(
        (update: Partial<T>) =>
            setValue({
                ...ref.current,
                ...update,
            }),
        [ref, setValue]
    );
    return [ref, setPartial] as const;
};

const useTableUpdateFunctions = (
    stateRef: React.MutableRefObject<TransactionsTableState>,
    setStatePartial: (state: Partial<TransactionsTableState>) => void,
    filterRef: React.MutableRefObject<TransactionsTableFilters>,
    setFiltersPartial: (state: Partial<TransactionsTableFilters>) => void
) =>
    useMemo(
        () => ({
            selection: (id: ID) => () =>
                setStatePartial({ selection: flipListIncludes(id, stateRef.current.selection) }),
            selectionHeader: (ids: ID[]) => () =>
                setStatePartial({ selection: stateRef.current.selection.length > 0 ? [] : ids }),
            edit: (edit: EditTransactionState) => setStatePartial({ edit }),
            editPartial: (update: Partial<EditTransactionState> | null) =>
                setStatePartial({ edit: update ? { ...stateRef.current.edit, ...update } : undefined }),
            loadMore: () =>
                setFiltersPartial({
                    tableLimit: filterRef.current.tableLimit + Math.min(100, filterRef.current.tableLimit),
                }),
        }),
        [stateRef, setStatePartial, filterRef, setFiltersPartial]
    );

const ActiveTableHeaderContainerSx = { boxShadow: TopHatTheme.shadows[5] };
