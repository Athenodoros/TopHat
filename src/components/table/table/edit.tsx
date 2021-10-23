import { CancelTwoTone, DeleteTwoTone, Description, Help, SaveTwoTone } from "@mui/icons-material";
import { DatePickerProps } from "@mui/lab";
import { Button, IconButton, MenuProps, TextField, Tooltip } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import clsx from "clsx";
import { isEqual } from "lodash";
import { DateTime } from "luxon";
import React, { useCallback, useMemo } from "react";
import { batch } from "react-redux";
import { TopHatDispatch } from "../../../state";
import { Category, DataSlice, EditTransactionState, Transaction } from "../../../state/data";
import { useAllAccounts, useAllCategories, useAllStatements } from "../../../state/data/hooks";
import { formatDate, ID } from "../../../state/shared/values";
import { Greys, Intents } from "../../../styles/colours";
import { SingleCategoryMenu } from "../../display/CategoryMenu";
import { getCategoryIcon, getStatementIcon, useGetAccountIcon } from "../../display/ObjectDisplay";
import { AutoClosingDatePicker } from "../../inputs";
import { EditableCurrencyValue, EditableTextValue, TransactionsTableObjectDropdown } from "./inputs";
import { useTransactionsTableStyles } from "./styles";
import { TransactionsTableFixedDataState, TransactionsTableState } from "./types";

const useEditStyles = makeStyles({
    centeredInput: {
        "& input": {
            textAlign: "center",
        },
    },
    editText: {
        marginTop: 5,
        marginBottom: 5,

        "& > div": {
            width: "100%",
        },
        "& > div:first-of-type": {
            marginBottom: 5,
        },
    },
    editActions: {
        visibility: "visible !important" as "visible",
    },
    categoryDropdownIcon: {
        height: 16,
        width: 16,
        borderRadius: "50%",
        marginRight: 8,
    },
    accountDropdownIcon: {
        height: 20,
        width: 20,
        borderRadius: 4,
        marginRight: 10,
    },
    selectButton: {
        height: 40,
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        textTransform: "inherit",
        color: "inherit",
    },
});

export interface TransactionsTableEditEntryProps {
    original?: EditTransactionState;
    edit: EditTransactionState;
    ids: ID[];
    setEditPartial: (update: Partial<EditTransactionState> | null) => void;
    setStatePartial: (update: Partial<TransactionsTableState>) => void;
    fixed?: TransactionsTableFixedDataState;
}
export const TransactionsTableEditEntry: React.FC<TransactionsTableEditEntryProps> = ({
    original: tx,
    ids,
    edit,
    setEditPartial,
    setStatePartial,
    fixed,
}) => {
    const classes = useTransactionsTableStyles();
    const editClasses = useEditStyles();

    const categories = useAllCategories();
    // const categories = useMemo(
    //     () =>
    //         allCategories.filter((option) =>
    //             fixed?.type === "category" && fixed.nested
    //                 ? option.id === fixed.category || option.hierarchy.includes(fixed.category)
    //                 : true
    //         ),
    //     [fixed, allCategories]
    // );
    const accounts = useAllAccounts();
    const getAccountIcon = useGetAccountIcon();
    const statements = useAllStatements();

    const actions = useActions(ids, edit, setStatePartial);
    const updaters = useEditUpdaters(setEditPartial);

    const getCategoryMenuContents = useCallback(
        (onClick: () => void) => {
            return (
                <SingleCategoryMenu
                    selected={edit.category}
                    setSelected={(category?: Category) => {
                        onClick();
                        updaters.category(category?.id);
                    }}
                    anchor={
                        fixed?.type === "category" && fixed.nested ? { id: fixed.category, include: true } : undefined
                    }
                />
            );
        },
        [edit.category, updaters, fixed]
    );

    return (
        <>
            <div className={classes.date}>
                <AutoClosingDatePicker
                    value={edit.date || null}
                    onChange={updaters.date as DatePickerProps["onChange"]}
                    disableFuture={true}
                    inputFormat="yyyy-MM-dd"
                    clearable={tx && tx.date === undefined}
                    className={editClasses.centeredInput}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            size="small"
                            placeholder="(mixed)"
                            InputProps={edit.date ? undefined : { className: classes.mixed }}
                        />
                    )}
                />
            </div>
            <div className={clsx(classes.text, editClasses.editText)}>
                <EditableTextValue
                    value={edit.summary}
                    placeholder={tx?.reference}
                    allowUndefined={!!tx && tx.summary === undefined}
                    onChange={updaters.summary}
                />
                <EditableTextValue
                    value={edit.description}
                    allowUndefined={!!tx && tx.description === undefined}
                    onChange={updaters.description}
                />
            </div>
            <div className={classes.value}>
                <EditableCurrencyValue
                    currency={edit.currency}
                    value={edit.value}
                    onChangeValue={updaters.value}
                    onChangeCurrency={updaters.currency}
                    allowUndefinedCurrency={!!tx && tx.currency === undefined}
                    allowUndefinedValue={!!tx && tx.value === undefined}
                />
            </div>
            {fixed?.type !== "category" || fixed.nested === true ? (
                <div className={classes.category}>
                    <TransactionsTableObjectDropdown
                        options={categories}
                        selected={edit.category}
                        select={updaters.category}
                        getIcon={getCategoryIcon}
                        iconClass={editClasses.categoryDropdownIcon}
                        allowUndefined={!!tx && tx.category === undefined}
                        getMenuContents={getCategoryMenuContents}
                        MenuProps={CategoryMenuProps}
                    />
                </div>
            ) : undefined}
            <div className={classes.balance}>
                <EditableCurrencyValue
                    currency={edit.currency}
                    value={edit.recordedBalance}
                    placeholder={edit.balance}
                    onChangeValue={updaters.balance}
                    onChangeCurrency={updaters.currency}
                    allowUndefinedCurrency={!!tx && tx.currency === undefined}
                    allowUndefinedValue={!!tx && tx.recordedBalance === undefined}
                />
            </div>
            <div className={classes.statement}>
                <TransactionsTableObjectDropdown
                    options={statements}
                    selected={edit.statement}
                    select={updaters.statement}
                    getIcon={getStatementIcon}
                    iconClass={editClasses.accountDropdownIcon}
                    allowUndefined={!!tx && tx.statement === undefined}
                    button={
                        <Button
                            variant="outlined"
                            endIcon={
                                edit.statement !== undefined ? (
                                    <Description
                                        fontSize="small"
                                        htmlColor={edit.statement ? Intents.primary.main : Intents.danger.main}
                                    />
                                ) : (
                                    <Help fontSize="small" htmlColor={Greys[500]} />
                                )
                            }
                            color="inherit"
                        />
                    }
                />
            </div>
            {fixed?.type !== "account" ? (
                <div className={classes.account}>
                    <TransactionsTableObjectDropdown
                        options={accounts}
                        selected={edit.account}
                        select={updaters.account}
                        getIcon={getAccountIcon}
                        iconClass={editClasses.accountDropdownIcon}
                        allowUndefined={!!tx && tx.account === undefined}
                    />
                </div>
            ) : undefined}
            <div className={clsx(classes.actions, editClasses.editActions)}>
                <Tooltip title="Save Changes">
                    <span>
                        <IconButton
                            size="small"
                            onClick={tx ? actions.save : actions.create}
                            disabled={isEqual(tx, edit)}
                        >
                            <SaveTwoTone
                                fontSize="small"
                                htmlColor={isEqual(tx, edit) ? Intents.success.light : Intents.success.main}
                            />
                        </IconButton>
                    </span>
                </Tooltip>
                <Tooltip title="Discard Changes">
                    <IconButton size="small" onClick={updaters.discard}>
                        <DeleteTwoTone fontSize="small" htmlColor={Intents.warning.main} />
                    </IconButton>
                </Tooltip>
                {tx && (
                    <Tooltip title="Delete Transaction">
                        <IconButton size="small" onClick={actions.delete}>
                            <CancelTwoTone fontSize="small" color="error" />
                        </IconButton>
                    </Tooltip>
                )}
            </div>
        </>
    );
};

const useActions = (
    ids: ID[],
    edit: EditTransactionState,
    setStatePartial: (update: Partial<TransactionsTableState>) => void
) =>
    useMemo(
        () => ({
            create: () =>
                batch(() => {
                    setStatePartial({ edit: undefined });
                    TopHatDispatch(DataSlice.actions.addNewTransactions({ transactions: [edit as Transaction] }));
                }),
            save: () =>
                batch(() => {
                    setStatePartial({ edit: undefined });
                    TopHatDispatch(
                        DataSlice.actions.updateTransactions({
                            ids,
                            edits: edit,
                        })
                    );
                }),
            delete: () =>
                batch(() => {
                    setStatePartial({ edit: undefined, selection: [] });
                    TopHatDispatch(DataSlice.actions.deleteTransactions(ids));
                }),
        }),
        [setStatePartial, edit, ids]
    );

const useEditUpdaters = (updater: (update: Partial<EditTransactionState> | null) => void) =>
    useMemo(
        () => ({
            // Updates
            date: (date: DateTime | null) => updater({ date: date ? formatDate(date) : undefined }),
            summary: (summary?: string | null) => updater({ summary: summary ?? undefined }),
            description: (description?: string | null) => updater({ description: description ?? undefined }),
            currency: (currency?: ID) => updater({ currency }),
            value: (value?: number | null) => updater({ value: value ?? undefined }),
            balance: (recordedBalance?: number | null) => updater({ recordedBalance: recordedBalance ?? undefined }),
            category: (category?: ID) => updater({ category }),
            statement: (statement?: ID) => updater({ statement }),
            account: (account?: ID) => updater({ account }),

            // Actions
            discard: () => updater(null),
        }),
        [updater]
    );

const CategoryMenuProps: Partial<MenuProps> = { PaperProps: { style: { maxHeight: 230, width: 300 } } };
