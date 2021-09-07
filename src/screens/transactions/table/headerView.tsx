import { IconButton, makeStyles, Menu, Popover, TextField, Typography } from "@material-ui/core";
import { AddCircleOutline, Description } from "@material-ui/icons";
import { last } from "lodash-es";
import React, { useMemo } from "react";
import { getCategoryIcon, getStatementIcon, useGetAccountIcon } from "../../../components/display/ObjectDisplay";
import { SubItemCheckbox } from "../../../components/inputs";
import { DateRangeFilter, NumericRangeFilter } from "../../../components/table";
import { FilterIcon, FilterMenuOption } from "../../../components/table/";
import { TopHatDispatch } from "../../../state";
import { AppSlice } from "../../../state/app";
import { useTransactionsPageFilters } from "../../../state/app/hooks";
import { TransactionsPageState } from "../../../state/app/pageTypes";
import { useAllAccounts, useAllCategories, useAllStatements, useFormatValue } from "../../../state/data/hooks";
import { useLocaliseCurrencies, useSelector } from "../../../state/utilities/hooks";
import { ID } from "../../../state/utilities/values";
import { Greys } from "../../../styles/colours";
import { zipObject } from "../../../utilities/data";
import { handleTextFieldChange } from "../../../utilities/events";
import { usePopoverProps } from "../../../utilities/hooks";
import { useTransactionsTableStyles } from "./styles";

const useHeaderStyles = makeStyles({
    description: {
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        padding: 20,
        width: 350,

        "& > div:first-child": {
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

        "& > div:first-child": {
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

export const TransactionsTableHeaderView: React.FC = () => {
    const classes = useTransactionsTableStyles();
    const headerClasses = useHeaderStyles();
    const filters = useTransactionsPageFilters();

    const accounts = useAllAccounts();
    const categories = useAllCategories();
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

    return (
        <>
            <div className={classes.date}>
                <div className={classes.compound}>
                    DATE
                    <FilterIcon
                        badgeContent={Number(!!filters.fromDate || !!filters.toDate)}
                        ButtonProps={DateRangePopoverState.buttonProps}
                        onRightClick={removeDateFilter}
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
                            setRange={setDateRange}
                        />
                    </Popover>
                </div>
            </div>
            <div className={classes.text}>
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
                        onRightClick={removeDescriptionFilter}
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
                                variant="outlined"
                                value={filters.search}
                                onChange={setSearch}
                            />
                        </div>
                        <SubItemCheckbox
                            label="Regex Search"
                            checked={filters.searchRegex}
                            setChecked={setSearchRegex}
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
                        onRightClick={removeValueFilter}
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
                            setRange={setValueRange}
                        />
                        <SubItemCheckbox
                            label="Hide Stubs"
                            checked={filters.hideStubs}
                            setChecked={setHideStubs}
                            className={headerClasses.subitem}
                        />
                    </Popover>
                </div>
            </div>
            <div className={classes.category}>
                <div className={classes.compound}>
                    CATEGORY
                    <FilterIcon
                        badgeContent={filters.category.length}
                        ButtonProps={CategoryPopoverState.buttonProps}
                        onRightClick={removeCategoryFilter}
                    />
                    <Menu {...CategoryPopoverState.popoverProps} PaperProps={{ style: { maxHeight: 250, width: 300 } }}>
                        {categories.map((option) => (
                            <FilterMenuOption
                                key={option.id}
                                option={option}
                                select={onSelectIDs["category"]}
                                selected={filters.category}
                                getOptionIcon={getCategoryIcon}
                            />
                        ))}
                    </Menu>
                </div>
            </div>
            <div className={classes.balance}>BALANCE</div>
            <div className={classes.statement}>
                <FilterIcon
                    badgeContent={filters.statement.length}
                    ButtonProps={StatementPopoverState.buttonProps}
                    margin="none"
                    Icon={Description}
                    onRightClick={removeStatementFilter}
                />
                <Menu {...StatementPopoverState.popoverProps} PaperProps={{ style: { maxHeight: 250, width: 300 } }}>
                    {statements.map((option) => (
                        <FilterMenuOption
                            key={option.id}
                            option={option}
                            select={onSelectIDs["statement"]}
                            selected={filters.statement}
                            getOptionIcon={getStatementIcon}
                            getSecondary={(option) => option.date}
                        />
                    ))}
                </Menu>
            </div>
            <div className={classes.account}>
                ACCOUNT
                <FilterIcon
                    badgeContent={filters.account.length}
                    ButtonProps={AccountPopoverState.buttonProps}
                    onRightClick={removeAccountFilter}
                />
                <Menu {...AccountPopoverState.popoverProps} PaperProps={{ style: { maxHeight: 250, width: 300 } }}>
                    {accounts.map((option) => (
                        <FilterMenuOption
                            key={option.id}
                            option={option}
                            select={onSelectIDs["account"]}
                            selected={filters.account}
                            getOptionIcon={getAccountIcon}
                        />
                    ))}
                </Menu>
            </div>
            <div className={classes.actions}>
                <IconButton size="small">
                    <AddCircleOutline />
                </IconButton>
            </div>
        </>
    );
};

const setFilterPartial = <Key extends keyof TransactionsPageState>(key: Key, value: TransactionsPageState[Key]) =>
    TopHatDispatch(AppSlice.actions.setTransactionsPagePartial({ [key]: value }));

const setDateRange = (fromDate?: string, toDate?: string) =>
    TopHatDispatch(AppSlice.actions.setTransactionsPagePartial({ fromDate, toDate }));

const setSearch = handleTextFieldChange((value) => setFilterPartial("search", value));
const setSearchRegex = (checked: boolean) => setFilterPartial("searchRegex", checked);

const setValueRange = (valueFrom: number | undefined, valueTo: number | undefined) =>
    TopHatDispatch(AppSlice.actions.setTransactionsPagePartial({ valueFrom, valueTo }));
const setHideStubs = (checked: boolean) => setFilterPartial("hideStubs", checked);

const filters = ["account", "category", "statement"] as const;
const onSelectIDs = zipObject(
    filters,
    filters.map((f) => (ids: ID[]) => TopHatDispatch(AppSlice.actions.setTransactionsPagePartial({ [f]: ids })))
);

const removeDateFilter = () =>
    TopHatDispatch(AppSlice.actions.setTransactionsPagePartial({ fromDate: undefined, toDate: undefined }));
const removeDescriptionFilter = () =>
    TopHatDispatch(AppSlice.actions.setTransactionsPagePartial({ search: undefined, searchRegex: false }));
const removeValueFilter = () =>
    TopHatDispatch(AppSlice.actions.setTransactionsPagePartial({ valueFrom: undefined, valueTo: undefined }));
const removeCategoryFilter = () => onSelectIDs.category([]);
const removeStatementFilter = () => onSelectIDs.statement([]);
const removeAccountFilter = () => onSelectIDs.account([]);

const useTransactionValueRange = () => {
    const localiseCurrencyValue = useLocaliseCurrencies();
    const transactions = useSelector((state) => state.data.transaction);
    return useMemo(() => {
        let min: number | undefined = undefined;
        let max: number | undefined = undefined;
        transactions.ids.forEach((id) => {
            const tx = transactions.entities[id!]!;
            if (!tx.value) return;

            const value = localiseCurrencyValue(tx.value, tx.currency);
            if (!min || value < min) min = value;
            if (!max || value > max) max = value;
        });

        return [min, max] as [number | undefined, number | undefined];
    }, [transactions, localiseCurrencyValue]);
};
