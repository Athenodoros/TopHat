import styled from "@emotion/styled";
import { AddCircleOutline, Description } from "@mui/icons-material";
import { IconButton, Menu, Popover, TextField, Typography } from "@mui/material";
import { last } from "lodash-es";
import React, { useCallback, useMemo } from "react";
import { zipObject } from "../../../shared/data";
import { handleTextFieldChange } from "../../../shared/events";
import { usePopoverProps } from "../../../shared/hooks";
import { TopHatStore } from "../../../state";
import { Transaction } from "../../../state/data";
import { useAllAccounts, useAllStatements, useFormatValue } from "../../../state/data/hooks";
import { getNextID, PLACEHOLDER_CATEGORY_ID, PLACEHOLDER_STATEMENT_ID } from "../../../state/data/shared";
import { StubUserID } from "../../../state/data/types";
import { useLocaliseCurrencies, useSelector } from "../../../state/shared/hooks";
import { getTodayString, ID } from "../../../state/shared/values";
import { MultipleCategoryMenu } from "../../display/CategoryMenu";
import { getStatementIconSx, useGetAccountIconSx } from "../../display/ObjectDisplay";
import { SubItemCheckbox } from "../../inputs";
import { FilterIcon } from "../filters/FilterIcon";
import { FilterMenuOption } from "../filters/FilterMenuOption";
import { DateRangeFilter, NumericRangeFilter } from "../filters/RangeFilters";
import {
    TransactionsTableSummaryTypography,
    TransactionTableAccountContainer,
    TransactionTableActionsContainer,
    TransactionTableBalanceContainer,
    TransactionTableCategoryContainer,
    TransactionTableCompoundContainer,
    TransactionTableDateContainer,
    TransactionTableStatementContainer,
    TransactionTableSxProps,
    TransactionTableTextContainer,
    TransactionTableValueContainer,
} from "./styles";
import { EditTransactionState, TransactionsTableFilters, TransactionsTableFixedDataState } from "./types";

export interface TransactionsTableHeaderProps {
    filters: TransactionsTableFilters;
    setFiltersPartial: (update: Partial<TransactionsTableFilters>) => void;
    setEdit: (edit: EditTransactionState) => void;
    fixed?: TransactionsTableFixedDataState;
    canCreateNew: boolean;
}
export const TransactionsTableHeader: React.FC<TransactionsTableHeaderProps> = ({
    filters,
    setFiltersPartial,
    setEdit,
    fixed,
    canCreateNew,
}) => {
    const accounts = useAllAccounts();
    const getAccountIcon = useGetAccountIconSx();
    const statements = useAllStatements();

    const startDate = useSelector(({ data: { transaction } }) => transaction.entities[last(transaction.ids)!]?.date);
    const valueFilterDomain = useTransactionValueRange();
    const formatCurrencyValue = useFormatValue("0,0.0");

    const DateRangePopoverState = usePopoverProps();
    const DescriptionPopoverState = usePopoverProps();
    const StatementPopoverState = usePopoverProps();
    const AccountPopoverState = usePopoverProps();
    const CategoryPopoverState = usePopoverProps();
    const ValuePopoverState = usePopoverProps();

    const updaters = useFilterUpdaters(setFiltersPartial);

    const createNewTransaction = useCreateNewTransaction(setEdit);

    return (
        <>
            <TransactionTableDateContainer>
                <TransactionTableCompoundContainer>
                    DATE
                    <FilterIcon
                        badgeContent={Number(!!filters.fromDate || !!filters.toDate)}
                        ButtonProps={DateRangePopoverState.buttonProps}
                        onRightClick={updaters.removeDate}
                    />
                    <Popover {...DateRangePopoverState.popoverProps} PaperProps={RangePopoverPaperProps}>
                        <div>
                            <Typography
                                variant="body1"
                                sx={filters.fromDate ? undefined : TransactionTableSxProps.MissingValue}
                            >
                                {filters.fromDate || startDate || "Today"}
                            </Typography>
                            <Typography
                                variant="body1"
                                sx={filters.toDate ? undefined : TransactionTableSxProps.MissingValue}
                            >
                                {filters.toDate || "Today"}
                            </Typography>
                        </div>
                        <DateRangeFilter
                            min={startDate}
                            from={filters.fromDate}
                            to={filters.toDate}
                            setRange={updaters.dates}
                        />
                    </Popover>
                </TransactionTableCompoundContainer>
            </TransactionTableDateContainer>
            <TextBox>
                <TransactionTableCompoundContainer>
                    <TransactionsTableSummaryTypography variant="body1" noWrap={true}>
                        DESCRIPTION
                    </TransactionsTableSummaryTypography>
                    <FilterIcon
                        badgeContent={filters.search.length}
                        ButtonProps={{
                            style: { margin: "-10px 0 -10px 10px" },
                            ...DescriptionPopoverState.buttonProps,
                        }}
                        onRightClick={updaters.removeSearch}
                    />
                    <Popover {...DescriptionPopoverState.popoverProps} PaperProps={DescriptionPopoverPaperProps}>
                        <div>
                            <Typography variant="body1">Search</Typography>
                            <TextField
                                size="small"
                                label="Search Term"
                                value={filters.search}
                                onChange={updaters.search}
                            />
                        </div>
                        <SubItemCheckbox
                            label="Regex Search"
                            checked={filters.searchRegex}
                            setChecked={updaters.searchRegex}
                            sx={SubItemSx}
                        />
                    </Popover>
                </TransactionTableCompoundContainer>
            </TextBox>
            <TransactionTableValueContainer>
                <TransactionTableCompoundContainer>
                    <FilterIcon
                        ButtonProps={ValuePopoverState.buttonProps}
                        badgeContent={Number(filters.valueFrom !== undefined || filters.valueTo !== undefined)}
                        margin="right"
                        onRightClick={updaters.removeValue}
                    />
                    VALUE
                    <Popover {...ValuePopoverState.popoverProps} PaperProps={RangePopoverPaperProps}>
                        <div>
                            <Typography
                                variant="body1"
                                sx={filters.valueFrom === undefined ? TransactionTableSxProps.MissingValue : undefined}
                            >
                                {filters.valueFrom === undefined ? "All" : formatCurrencyValue(filters.valueFrom)}
                            </Typography>
                            <Typography
                                variant="body1"
                                sx={filters.valueTo === undefined ? TransactionTableSxProps.MissingValue : undefined}
                            >
                                {filters.valueTo === undefined ? "All" : formatCurrencyValue(filters.valueTo)}
                            </Typography>
                        </div>
                        <NumericRangeFilter
                            min={valueFilterDomain[0]}
                            max={valueFilterDomain[1]}
                            from={filters.valueFrom}
                            to={filters.valueTo}
                            setRange={updaters.values}
                        />
                        <SubItemCheckbox
                            label="Hide Stubs"
                            checked={filters.hideStubs}
                            setChecked={updaters.hideStubs}
                            sx={SubItemSx}
                        />
                    </Popover>
                </TransactionTableCompoundContainer>
            </TransactionTableValueContainer>
            {fixed?.type !== "category" || fixed.nested === true ? (
                <TransactionTableCategoryContainer>
                    <TransactionTableCompoundContainer>
                        CATEGORY
                        <FilterIcon
                            badgeContent={filters.category.length}
                            ButtonProps={CategoryPopoverState.buttonProps}
                            onRightClick={updaters.removeCategories}
                        />
                        <Menu
                            {...CategoryPopoverState.popoverProps}
                            PaperProps={{ style: { maxHeight: 230, width: 300 } }}
                        >
                            <MultipleCategoryMenu
                                selected={filters.category}
                                setSelected={updaters.selectIDs.category}
                                anchor={fixed?.type === "category" ? { id: fixed.category } : undefined}
                            />
                        </Menu>
                    </TransactionTableCompoundContainer>
                </TransactionTableCategoryContainer>
            ) : undefined}
            <TransactionTableBalanceContainer>BALANCE</TransactionTableBalanceContainer>
            <TransactionTableStatementContainer>
                <FilterIcon
                    badgeContent={filters.statement.length}
                    ButtonProps={StatementPopoverState.buttonProps}
                    margin="none"
                    Icon={Description}
                    onRightClick={updaters.removeStatements}
                />
                <Menu {...StatementPopoverState.popoverProps} PaperProps={{ style: { maxHeight: 250, width: 300 } }}>
                    {statements.map((option) => (
                        <FilterMenuOption
                            key={option.id}
                            option={option}
                            select={updaters.selectIDs.statement}
                            selected={filters.statement}
                            getOptionIcon={getStatementIconSx}
                            getSecondary={(option) => option.date}
                        />
                    ))}
                </Menu>
            </TransactionTableStatementContainer>
            {fixed?.type !== "account" ? (
                <TransactionTableAccountContainer>
                    ACCOUNT
                    <FilterIcon
                        badgeContent={filters.account.length}
                        ButtonProps={AccountPopoverState.buttonProps}
                        onRightClick={updaters.removeAccounts}
                    />
                    <Menu {...AccountPopoverState.popoverProps} PaperProps={{ style: { maxHeight: 250, width: 300 } }}>
                        {accounts.map((option) => (
                            <FilterMenuOption
                                key={option.id}
                                option={option}
                                select={updaters.selectIDs.account}
                                selected={filters.account}
                                getOptionIcon={getAccountIcon}
                            />
                        ))}
                    </Menu>
                </TransactionTableAccountContainer>
            ) : undefined}
            <TransactionTableActionsContainer>
                <IconButton size="small" onClick={createNewTransaction} disabled={!canCreateNew}>
                    <AddCircleOutline />
                </IconButton>
            </TransactionTableActionsContainer>
        </>
    );
};

const arrayFilters = ["account", "category", "statement"] as const;
const useFilterUpdaters = (update: (value: Partial<TransactionsTableFilters>) => void) =>
    useMemo(
        () => ({
            // Set filters
            dates: (fromDate?: string, toDate?: string) => update({ fromDate, toDate }),
            search: handleTextFieldChange((search) => update({ search })),
            searchRegex: (searchRegex: boolean) => update({ searchRegex }),
            values: (valueFrom: number | undefined, valueTo: number | undefined) => update({ valueFrom, valueTo }),
            hideStubs: (hideStubs: boolean) => update({ hideStubs }),
            selectIDs: zipObject(
                arrayFilters,
                arrayFilters.map((f) => (ids: ID[]) => update({ [f]: ids }))
            ),

            // Cancel Filters
            removeDate: () => update({ fromDate: undefined, toDate: undefined }),
            removeSearch: () => update({ search: "", searchRegex: undefined }),
            removeValue: () => update({ valueFrom: undefined, valueTo: undefined }),
            removeCategories: () => update({ category: [] }),
            removeStatements: () => update({ statement: [] }),
            removeAccounts: () => update({ account: [] }),
        }),
        [update]
    );

// This function gives the maximum and minimum values of all transactions
const useTransactionValueRange = () => {
    const localiseCurrencyValue = useLocaliseCurrencies();
    const transactions = useSelector((state) => state.data.transaction);
    return useMemo(() => {
        let min: number | undefined = undefined;
        let max: number | undefined = undefined;
        transactions.ids.forEach((id) => {
            const tx = transactions.entities[id!]!;
            if (!tx.value) return;

            const value = localiseCurrencyValue(tx.value, tx.currency, tx.date);
            if (!min || value < min) min = value;
            if (!max || value > max) max = value;
        });

        return [min, max] as [number | undefined, number | undefined];
    }, [transactions, localiseCurrencyValue]);
};

export const getNewTransaction = (): Transaction => {
    const { data } = TopHatStore.getState();

    return {
        id: getNextID(data.transaction.ids),
        date: getTodayString(),
        reference: "Manual Transaction",
        summary: null,
        description: null,
        value: null,
        recordedBalance: null,
        balance: null,
        account: data.account.ids[0] as number,
        category: PLACEHOLDER_CATEGORY_ID,
        currency: data.user.entities[StubUserID]!.currency,
        statement: PLACEHOLDER_STATEMENT_ID,
    };
};

const useCreateNewTransaction = (
    setEdit: (edit: EditTransactionState) => void,
    fixed?: TransactionsTableFixedDataState
) =>
    useCallback(() => {
        const transaction = getNewTransaction();

        if (fixed?.type === "account") transaction.account = fixed.account;
        if (fixed?.type === "category") transaction.category = fixed.category;

        setEdit(transaction);
    }, [setEdit, fixed]);

const RangePopoverPaperProps = {
    sx: {
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        padding: "15px 25px",
        width: 300,

        "& > div:first-of-type": {
            display: "flex",
            justifyContent: "space-between",
        },
    },
} as const;
const DescriptionPopoverPaperProps = {
    sx: {
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        padding: 20,
        width: 350,

        "& > div:first-of-type": {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",

            "& > div:last-child": {
                width: 200,
            },
        },
    },
} as const;
const TextBox = styled(TransactionTableTextContainer)({ marginTop: 9 });
const SubItemSx = { alignSelf: "flex-end" };
