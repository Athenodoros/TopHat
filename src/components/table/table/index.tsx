import styled from "@emotion/styled";
import { PlaylistAdd } from "@mui/icons-material";
import { Button, Card, Checkbox } from "@mui/material";
import { Box } from "@mui/system";
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
import { TransactionTableSxProps } from "./styles";
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
                <CheckboxContainer>
                    <Checkbox
                        indeterminate={!!selection.length && selection.length !== ids.length}
                        checked={!!selection.length}
                        onChange={updaters.selectionHeader(ids)}
                        color="primary"
                        disabled={!!edit}
                    />
                </CheckboxContainer>
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
                <RowGroupCard elevation={0}>
                    <ContainerBox>
                        <CheckboxContainer>
                            <Checkbox checked={false} onChange={noop} color="primary" disabled={true} />
                        </CheckboxContainer>
                        <TransactionsTableEditEntry
                            edit={edit}
                            selected={[edit.id]}
                            setEditPartial={updaters.editPartial}
                            setStatePartial={setStatePartial}
                            fixed={fixed}
                        />
                    </ContainerBox>
                </RowGroupCard>
            ) : undefined}
            {groups.map(([date, list]) => (
                <RowGroupCard key={date} elevation={0}>
                    {list.map((id) => (
                        <ContainerBox key={id}>
                            <CheckboxContainer>
                                <Checkbox
                                    checked={selection.includes(id)}
                                    onChange={updaters.selection(id)}
                                    color="primary"
                                    disabled={!!edit}
                                />
                            </CheckboxContainer>
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
                        </ContainerBox>
                    ))}
                </RowGroupCard>
            ))}
            <LoadMoreButton
                variant="outlined"
                size="large"
                onClick={updaters.loadMore}
                endIcon={<PlaylistAdd />}
                disabled={!more}
            >
                Load More
            </LoadMoreButton>
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
const RowGroupCard = styled(Card)({ marginTop: 20, borderRadius: "10px", padding: 0 });
const ContainerBox = styled(Box)({
    ...TransactionTableSxProps.Container,

    "& > div:last-child": {
        visibility: "hidden",
    },
    "&:hover > div:last-child": {
        visibility: "inherit",
    },
} as any);
const CheckboxContainer = styled(Box)(TransactionTableSxProps.CenteredValueContainer);
const LoadMoreButton = styled(Button)({ marginTop: 50, alignSelf: "center" });
