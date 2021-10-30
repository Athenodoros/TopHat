import styled from "@emotion/styled";
import { PlaylistAdd } from "@mui/icons-material";
import { Button, Card, Checkbox } from "@mui/material";
import { Dictionary } from "@reduxjs/toolkit";
import { noop, sumBy } from "lodash";
import React, { useCallback, useMemo, useRef } from "react";
import { WindowScroller } from "react-virtualized";
import { VariableSizeList } from "react-window";
import { TableHeaderContainer } from "..";
import { flipListIncludes } from "../../../shared/data";
import { useRefToValue } from "../../../shared/hooks";
import { Transaction } from "../../../state/data";
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

    const listRef = useRef<VariableSizeList>(null);
    const handleScroll = useCallback(({ scrollTop }: { scrollTop: number }) => {
        console.log("Scrolling:", listRef.current);
        listRef.current?.scrollTo(scrollTop);
    }, []);

    const newEditOffset = edit?.id !== undefined && !ids.includes(edit.id) ? 1 : 0;
    const heights: number[] = useMemo(
        () => groups.map(([_, ids]) => getGroupHeight(ids, metadata, edit?.id)),
        [groups, metadata, edit?.id]
    );

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
            <WindowScroller onScroll={handleScroll}>{() => <div />}</WindowScroller>
            <VariableSizeList
                ref={listRef}
                itemCount={groups.length + newEditOffset}
                itemSize={(index) =>
                    ROW_GROUP_MARGIN +
                    (newEditOffset === 1 && index === 0 ? EDIT_ROW_HEIGHT : heights[index - newEditOffset])
                }
                width={window.innerWidth}
                height={window.innerHeight}
                style={{ width: "unset", height: "unset" }}
            >
                {({ index, style }) =>
                    newEditOffset === 1 && index === 0 ? (
                        <RowGroupCard elevation={0}>
                            <ContainerBox>
                                <CheckboxContainer>
                                    <Checkbox checked={false} onChange={noop} color="primary" disabled={true} />
                                </CheckboxContainer>
                                <TransactionsTableEditEntry
                                    edit={edit!}
                                    selected={selection}
                                    setEditPartial={updaters.editPartial}
                                    setStatePartial={setStatePartial}
                                    fixed={fixed}
                                />
                            </ContainerBox>
                        </RowGroupCard>
                    ) : (
                        <RowGroupCard key={groups[index - newEditOffset][0]} elevation={0}>
                            {groups[index - newEditOffset][1].map((id) => (
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
                    )
                }
            </VariableSizeList>
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

const ROW_GROUP_MARGIN = 20;
const EDIT_ROW_HEIGHT = 96;

const getGroupHeight = (ids: ID[], metadata: Dictionary<Transaction>, edit?: ID) =>
    sumBy(ids, (id) => {
        if (edit === id) return EDIT_ROW_HEIGHT;

        const description = metadata[id]!.description;
        if (!description) return 51;

        let TODO = 1; // Should be 52 + 16 * number of lines of description
        return 68;
    });

const ActiveTableHeaderContainerSx = { boxShadow: TopHatTheme.shadows[5] };
const RowGroupCard = styled(Card)({ marginTop: ROW_GROUP_MARGIN, borderRadius: "10px", padding: 0 });
const ContainerBox = styled("div")({
    ...TransactionTableSxProps.Container,

    "& > div:last-child": {
        visibility: "hidden",
    },
    "&:hover > div:last-child": {
        visibility: "inherit",
    },
} as any);
const CheckboxContainer = styled("div")(TransactionTableSxProps.CenteredValueContainer);
const LoadMoreButton = styled(Button)({ marginTop: 50, alignSelf: "center" });
