import styled from "@emotion/styled";
import { AddCircleOutline, Description } from "@mui/icons-material";
import { IconButton, Menu, Popover, TextField, TextFieldProps, Typography } from "@mui/material";
import { debounce, keys, last, omit } from "lodash-es";
import React, { useCallback, useMemo } from "react";
import { formatNumber, zipObject } from "../../../shared/data";
import { handleTextFieldChange } from "../../../shared/events";
import { useFirstValue, useNumericInputHandler, usePopoverProps } from "../../../shared/hooks";
import { FCWithChildren } from "../../../shared/types";
import { TopHatStore } from "../../../state";
import { Transaction } from "../../../state/data";
import { useAllAccounts, useAllStatements } from "../../../state/data/hooks";
import { getNextID, PLACEHOLDER_CATEGORY_ID, PLACEHOLDER_STATEMENT_ID } from "../../../state/data/shared";
import { StubUserID } from "../../../state/data/types";
import { useLocaliseCurrencies, useSelector } from "../../../state/shared/hooks";
import { getTodayString, ID } from "../../../state/shared/values";
import { MultipleCategoryMenu } from "../../display/CategoryMenu";
import { NonIdealState } from "../../display/NonIdealState";
import { getStatementIcon, useGetAccountIcon } from "../../display/ObjectDisplay";
import { ManagedDatePicker, SubItemCheckbox } from "../../inputs";
import { FilterIcon } from "../filters/FilterIcon";
import { FilterMenuOption } from "../filters/FilterMenuOption";
import {
    TransactionsTableSummaryTypography,
    TransactionTableAccountContainer,
    TransactionTableActionsContainer,
    TransactionTableBalanceContainer,
    TransactionTableCategoryContainer,
    TransactionTableCompoundContainer,
    TransactionTableDateContainer,
    TransactionTableStatementContainer,
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
    const getAccountIcon = useGetAccountIcon();
    const statements = useAllStatements(
        fixed?.type === "account" ? (statement) => statement.account === fixed.account : undefined
    );

    const valueFilterDomain = useTransactionValueRange();

    const startDate = useSelector(({ data: { transaction } }) => transaction.entities[last(transaction.ids)!]?.date);
    const endDate = useSelector(({ data: { transaction } }) => transaction.entities[transaction.ids[0]]?.date);
    const startDatePickerProps = useManagedDatePickerProps(startDate || getTodayString());
    const endDatePickerProps = useManagedDatePickerProps(endDate || getTodayString());

    const DateRangePopoverState = usePopoverProps();
    const DescriptionPopoverState = usePopoverProps();
    const StatementPopoverState = usePopoverProps();
    const AccountPopoverState = usePopoverProps();
    const CategoryPopoverState = usePopoverProps();
    const ValuePopoverState = usePopoverProps();

    const updaters = useFilterUpdaters(setFiltersPartial);

    const createNewTransaction = useCreateNewTransaction(setEdit, fixed);

    const valueFromHandler = useNumericInputHandler(filters.valueFrom ?? null, updaters.valueFrom);
    const valueToHandler = useNumericInputHandler(filters.valueTo ?? null, updaters.valueTo);

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
                    <Popover {...DateRangePopoverState.popoverProps} PaperProps={PopoverPaperProps}>
                        <SubHeader name="Start Date">
                            <ManagedDatePicker
                                value={filters.fromDate}
                                onChange={updaters.fromDate}
                                {...startDatePickerProps}
                            />
                        </SubHeader>
                        <SubHeader name="End Date">
                            <ManagedDatePicker
                                value={filters.toDate}
                                onChange={updaters.toDate}
                                {...endDatePickerProps}
                            />
                        </SubHeader>
                        <div />
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
                    <Popover {...DescriptionPopoverState.popoverProps} PaperProps={PopoverPaperProps}>
                        <SubHeader name="Search">
                            <UnmountableTextField
                                size="small"
                                label="Search Term"
                                value={filters.search}
                                onChange={updaters.search}
                                sx={{ width: 200 }}
                            />
                        </SubHeader>
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
                    <Popover {...ValuePopoverState.popoverProps} PaperProps={PopoverPaperProps}>
                        <SubHeader name="Values From">
                            <TextField
                                value={valueFromHandler.text}
                                onChange={valueFromHandler.onTextChange}
                                size="small"
                                placeholder={maybeFormatNumberValue(valueFilterDomain[0])}
                            />
                        </SubHeader>
                        <SubHeader name="Values To">
                            <TextField
                                value={valueToHandler.text}
                                onChange={valueToHandler.onTextChange}
                                size="small"
                                placeholder={maybeFormatNumberValue(valueFilterDomain[1])}
                            />
                        </SubHeader>
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
                    {statements.length ? (
                        statements.map((option) => (
                            <FilterMenuOption
                                key={option.id}
                                option={option}
                                select={updaters.selectIDs.statement}
                                selected={filters.statement}
                                getOptionIcon={getStatementIcon}
                                getSecondary={(option) => option.date}
                            />
                        ))
                    ) : (
                        <NonIdealState icon={Description} title="No Statements" intent="app" />
                    )}
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

// useFirstValue has to be contained within the popover so that when it unmounts and
// mounts again, defaultValue is set to the latest value
const UnmountableTextField: React.FC<TextFieldProps> = (props) => {
    const defaultValue = useFirstValue(props.value);
    return <TextField {...omit(props, "value")} defaultValue={defaultValue} />;
};

const arrayFilters = ["account", "category", "statement"] as const;
const useFilterUpdaters = (update: (value: Partial<TransactionsTableFilters>) => void) =>
    useMemo(
        () => ({
            // Set filters
            fromDate: debounce((fromDate?: string) => update({ fromDate })),
            toDate: debounce((toDate?: string) => update({ toDate })),
            dates: (fromDate?: string, toDate?: string) => update({ fromDate, toDate }),
            search: handleTextFieldChange(debounce((search: string) => update({ search }), 200)),
            searchRegex: (searchRegex: boolean) => update({ searchRegex }),
            valueFrom: (value: number | null) => update({ valueFrom: value ?? undefined }),
            valueTo: (value: number | null) => update({ valueTo: value ?? undefined }),
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

        if (fixed?.type === "account") {
            transaction.account = fixed.account;

            transaction.currency = Number(
                keys(TopHatStore.getState().data.account.entities[fixed.account]!.balances)[0] ?? transaction.currency
            );
        }
        if (fixed?.type === "category") transaction.category = fixed.category;

        setEdit(transaction);
    }, [setEdit, fixed]);

const PopoverPaperProps = {
    sx: {
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        padding: "20px 20px 10px 20px",
        width: 350,
    },
} as const;
const TextBox = styled(TransactionTableTextContainer)({ marginTop: 9 });
const SubItemSx = { alignSelf: "flex-end" };
const useManagedDatePickerProps = (placeholder: string) =>
    useMemo(
        () => ({
            nullable: true,
            renderInput: (params: TextFieldProps) => (
                <TextField {...params} size="small" inputProps={{ ...params.inputProps, placeholder }} />
            ),
            clearable: true,
            showTodayButton: true,
            PaperProps: {
                sx: {
                    "& .PrivatePickersSlideTransition-root": { minHeight: 230 },
                },
            },
        }),
        [placeholder]
    );

const SubHeaderDiv = styled("div")({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",

    "&:not(:last-of-type)": { paddingBottom: 8 },
    input: {
        width: 110, // Excluding default padding of 14 * 2
    },
});
const SubHeader: FCWithChildren<{ name: string }> = ({ name, children }) => (
    <>
        <SubHeaderDiv>
            <Typography variant="body1">{name}</Typography>
            {children}
        </SubHeaderDiv>
    </>
);

const maybeFormatNumberValue = (value?: number) =>
    value !== undefined ? formatNumber(value, { minDecimals: 2 }) : undefined;
