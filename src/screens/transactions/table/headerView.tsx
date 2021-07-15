import {
    Button,
    Checkbox,
    CheckboxProps,
    FormControlLabel,
    IconButton,
    makeStyles,
    Menu,
    Popover,
    TextField,
    Typography,
} from "@material-ui/core";
import { AddCircleOutline, Description, ImportExport } from "@material-ui/icons";
import clsx from "clsx";
import { last } from "lodash-es";
import React, { useCallback, useMemo } from "react";
import { DateRangeFilter, NumericRangeFilter } from "../../../components/table";
import { FilterIcon, FilterMenuOption } from "../../../components/table/";
import { useGetAccountIcon } from "../../../components/table/filters/FilterMenuOption";
import { TopHatDispatch, TopHatStore } from "../../../state";
import { AppSlice } from "../../../state/app";
import { useTransactionsPageState } from "../../../state/app/hooks";
import { BooleanFilters, TransactionsPageState } from "../../../state/app/types";
import { Category } from "../../../state/data";
import { useAllAccounts, useAllCategories, useFormatValue } from "../../../state/data/hooks";
import { useLocaliseCurrencies, useSelector } from "../../../state/utilities/hooks";
import { ID } from "../../../state/utilities/values";
import { Greys } from "../../../styles/colours";
import { zipObject } from "../../../utilities/data";
import { onTextFieldChange } from "../../../utilities/events";
import { usePopoverProps } from "../../../utilities/hooks";
import { getIconStyles, useTransactionsTableStyles } from "./styles";

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
    subItemCheckbox: {
        alignSelf: "flex-end",
        transform: "scale(0.8)",
        transformOrigin: "top right",

        "&:hover": {
            opacity: "1 !important",
        },
    },
});

export const TransactionsTableHeaderView: React.FC = () => {
    const classes = useTransactionsTableStyles();
    const headerClasses = useHeaderStyles();
    const filters = useTransactionsPageState();

    const accounts = useAllAccounts();
    const categories = useAllCategories();
    const getAccountIcon = useGetAccountIcon();
    const getCategoryIcon = useCallback(
        (category: Category, className: string) => (
            <div className={clsx(classes.categoryIcon, className)} style={getIconStyles(category?.colour)} />
        ),
        [classes.categoryIcon]
    );

    const startDate = useSelector(({ data: { transaction } }) => transaction.entities[last(transaction.ids)!]?.date);
    const valueFilterDomain = useTransactionValueRange();
    const formatCurrencyValue = useFormatValue("0,0.0");

    const DateRangePopoverState = usePopoverProps();
    const DescriptionPopoverState = usePopoverProps();
    const AccountPopoverState = usePopoverProps();
    const CategoryPopoverState = usePopoverProps();
    const ValuePopoverState = usePopoverProps();

    const getSubItemCheckbox = (label: string, checked: boolean, setChecked: CheckboxProps["onChange"]) => (
        <FormControlLabel
            className={headerClasses.subItemCheckbox}
            control={<Checkbox color="primary" size="small" value={checked} onChange={setChecked} />}
            label={label}
            labelPlacement="start"
            style={{
                opacity: checked ? undefined : 0.5,
            }}
        />
    );

    return (
        <>
            <div className={classes.transfer}>
                <Button
                    endIcon={<ImportExport fontSize="small" color={BooleanFilterColours[filters.transfers]} />}
                    onClick={onTransferToggle}
                />
            </div>
            <div className={classes.date}>
                <div className={classes.compound}>
                    DATE
                    <FilterIcon
                        badgeContent={Number(!!filters.fromDate || !!filters.toDate)}
                        ButtonProps={DateRangePopoverState.buttonProps}
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
                        {getSubItemCheckbox("Regex Search", filters.searchRegex, setSearchRegex)}
                    </Popover>
                </div>
            </div>
            <div className={classes.value}>
                <div className={classes.compound}>
                    <FilterIcon
                        ButtonProps={ValuePopoverState.buttonProps}
                        badgeContent={Number(filters.valueFrom !== undefined || filters.valueTo !== undefined)}
                        margin="right"
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
                        {getSubItemCheckbox("Hide Stubs", filters.hideStubs, setHideStubs)}
                    </Popover>
                </div>
            </div>
            <div className={classes.category}>
                <div className={classes.compound}>
                    CATEGORY
                    <FilterIcon badgeContent={filters.category.length} ButtonProps={CategoryPopoverState.buttonProps} />
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
                <Button
                    endIcon={<Description fontSize="small" color={BooleanFilterColours[filters.statement]} />}
                    onClick={onStatementToggle}
                />
            </div>
            <div className={classes.account}>
                ACCOUNT
                <FilterIcon badgeContent={filters.account.length} ButtonProps={AccountPopoverState.buttonProps} />
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

const getCurrentState = () => TopHatStore.getState().app.page as TransactionsPageState;
const setFilterPartial = <Key extends keyof TransactionsPageState>(key: Key, value: TransactionsPageState[Key]) =>
    TopHatDispatch(AppSlice.actions.setTransactionsPagePartial({ [key]: value }));

const onBooleanFilterToggle = (key: "transfers" | "statement") => () =>
    setFilterPartial(key, BooleanFilters[(BooleanFilters.indexOf(getCurrentState()[key]) + 1) % BooleanFilters.length]);
const onTransferToggle = onBooleanFilterToggle("transfers");
const onStatementToggle = onBooleanFilterToggle("statement");

const setDateRange = (fromDate?: string, toDate?: string) =>
    TopHatDispatch(AppSlice.actions.setTransactionsPagePartial({ fromDate, toDate }));

const setSearch = onTextFieldChange((value) => setFilterPartial("search", value));
const setSearchRegex = (_: any, checked: boolean) => setFilterPartial("searchRegex", checked);

const setValueRange = (valueFrom: number | undefined, valueTo: number | undefined) =>
    TopHatDispatch(AppSlice.actions.setTransactionsPagePartial({ valueFrom, valueTo }));
const setHideStubs = (_: any, checked: boolean) => setFilterPartial("hideStubs", checked);

const filters = ["account", "category"] as const;
const onSelectIDs = zipObject(
    filters,
    filters.map((f) => (ids: ID[]) => TopHatDispatch(AppSlice.actions.setTransactionsPagePartial({ [f]: ids })))
);

const BooleanFilterColours = {
    all: "inherit",
    include: "primary",
    exclude: "error",
} as const;

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
