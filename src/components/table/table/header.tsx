import { AddCircleOutline, Description } from "@mui/icons-material";
import { IconButton, Menu, Popover, TextField, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import clsx from "clsx";
import { last } from "lodash-es";
import React, { useCallback, useMemo } from "react";
import { zipObject } from "../../../shared/data";
import { handleTextFieldChange } from "../../../shared/events";
import { usePopoverProps } from "../../../shared/hooks";
import { TopHatStore } from "../../../state";
import { EditTransactionState } from "../../../state/data";
import { useAllAccounts, useAllStatements, useFormatValue } from "../../../state/data/hooks";
import { getNextID, PLACEHOLDER_CATEGORY_ID, PLACEHOLDER_STATEMENT_ID } from "../../../state/data/shared";
import { StubUserID } from "../../../state/data/types";
import { useLocaliseCurrencies, useSelector } from "../../../state/shared/hooks";
import { getTodayString, ID } from "../../../state/shared/values";
import { Greys } from "../../../styles/colours";
import { MultipleCategoryMenu } from "../../display/CategoryMenu";
import { getStatementIcon, useGetAccountIcon } from "../../display/ObjectDisplay";
import { SubItemCheckbox } from "../../inputs";
import { FilterIcon } from "../filters/FilterIcon";
import { FilterMenuOption } from "../filters/FilterMenuOption";
import { DateRangeFilter, NumericRangeFilter } from "../filters/RangeFilters";
import { useTransactionsTableStyles } from "./styles";
import { TransactionsTableFilters, TransactionsTableFixedDataState } from "./types";

const useHeaderStyles = makeStyles({
    text: {
        marginTop: 9,
    },
    description: {
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
    range: {
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
    missing: {
        fontStyle: "italic",
        color: Greys[500],
    },
    icon: {
        // This is to ensure the icons line up with the transaction table
        borderColor: "transparent",

        "& svg:not(.MuiSvgIcon-colorPrimary):not(.MuiSvgIcon-colorError)": {
            color: Greys[500],
        },
    },
    subitem: {
        alignSelf: "flex-end",
    },
});

export interface TransactionsTableHeaderProps {
    filters: TransactionsTableFilters;
    setFiltersPartial: (update: Partial<TransactionsTableFilters>) => void;
    setEdit: (edit: EditTransactionState) => void;
    fixed?: TransactionsTableFixedDataState;
}
export const TransactionsTableHeader: React.FC<TransactionsTableHeaderProps> = ({
    filters,
    setFiltersPartial,
    setEdit,
    fixed,
}) => {
    const classes = useTransactionsTableStyles();
    const headerClasses = useHeaderStyles();

    const accounts = useAllAccounts();
    const getAccountIcon = useGetAccountIcon();
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
            <div className={classes.date}>
                <div className={classes.compound}>
                    DATE
                    <FilterIcon
                        badgeContent={Number(!!filters.fromDate || !!filters.toDate)}
                        ButtonProps={DateRangePopoverState.buttonProps}
                        onRightClick={updaters.removeDate}
                    />
                    <Popover {...DateRangePopoverState.popoverProps} PaperProps={{ className: headerClasses.range }}>
                        <div>
                            <Typography variant="body1" className={filters.fromDate || headerClasses.missing}>
                                {filters.fromDate || startDate || "Today"}
                            </Typography>
                            <Typography variant="body1" className={filters.toDate || headerClasses.missing}>
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
                </div>
            </div>
            <div className={clsx(classes.text, headerClasses.text)}>
                <div className={classes.compound}>
                    <Typography variant="body1" noWrap={true} className={classes.summary}>
                        DESCRIPTION
                    </Typography>
                    <FilterIcon
                        badgeContent={filters.search.length}
                        ButtonProps={{
                            style: { margin: "-10px 0 -10px 10px" },
                            ...DescriptionPopoverState.buttonProps,
                        }}
                        onRightClick={updaters.removeSearch}
                    />
                    <Popover
                        {...DescriptionPopoverState.popoverProps}
                        PaperProps={{ className: headerClasses.description }}
                    >
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
                            className={headerClasses.subitem}
                        />
                    </Popover>
                </div>
            </div>
            <div className={classes.value}>
                <div className={classes.compound}>
                    <FilterIcon
                        ButtonProps={ValuePopoverState.buttonProps}
                        badgeContent={Number(filters.valueFrom !== undefined || filters.valueTo !== undefined)}
                        margin="right"
                        onRightClick={updaters.removeValue}
                    />
                    VALUE
                    <Popover {...ValuePopoverState.popoverProps} PaperProps={{ className: headerClasses.range }}>
                        <div>
                            <Typography
                                variant="body1"
                                className={filters.valueFrom === undefined ? headerClasses.missing : undefined}
                            >
                                {filters.valueFrom === undefined ? "All" : formatCurrencyValue(filters.valueFrom)}
                            </Typography>
                            <Typography
                                variant="body1"
                                className={filters.valueTo === undefined ? headerClasses.missing : undefined}
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
                            className={headerClasses.subitem}
                        />
                    </Popover>
                </div>
            </div>
            {fixed?.type !== "category" || fixed.nested === true ? (
                <div className={classes.category}>
                    <div className={classes.compound}>
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
                    </div>
                </div>
            ) : undefined}
            <div className={classes.balance}>BALANCE</div>
            <div className={classes.statement}>
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
                            getOptionIcon={getStatementIcon}
                            getSecondary={(option) => option.date}
                        />
                    ))}
                </Menu>
            </div>
            {fixed?.type !== "account" ? (
                <div className={classes.account}>
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
                </div>
            ) : undefined}
            <div className={classes.actions}>
                <IconButton size="small" onClick={createNewTransaction}>
                    <AddCircleOutline />
                </IconButton>
            </div>
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

const useCreateNewTransaction = (
    setEdit: (edit: EditTransactionState) => void,
    fixed?: TransactionsTableFixedDataState
) =>
    useCallback(() => {
        const { data } = TopHatStore.getState();

        setEdit({
            id: getNextID(data.transaction.ids),
            date: getTodayString(),
            summary: "Manual Transaction",
            value: null,
            recordedBalance: null,
            balance: null,
            account: fixed?.type === "account" ? fixed.account : (data.account.ids[0] as number),
            category: fixed?.type === "category" ? fixed.category : PLACEHOLDER_CATEGORY_ID,
            currency: data.user.entities[StubUserID]!.currency,
            statement: PLACEHOLDER_STATEMENT_ID,
        });
    }, [setEdit, fixed]);
