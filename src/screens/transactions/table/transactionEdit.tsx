import { IconButton, makeStyles, Tooltip } from "@material-ui/core";
import { CancelTwoTone, DeleteTwoTone, Description, SaveTwoTone } from "@material-ui/icons";
import { DatePicker } from "@material-ui/pickers";
import clsx from "clsx";
import { DateTime } from "luxon";
import React from "react";
import { getCategoryIcon, useGetAccountIcon } from "../../../components/display/ObjectDisplay";
import { TopHatDispatch, TopHatStore } from "../../../state";
import { AppSlice } from "../../../state/app";
import { useTransactionsPageState } from "../../../state/app/hooks";
import { EditTransactionState, TransactionsPageState } from "../../../state/app/types";
import { Transaction } from "../../../state/data";
import { useAllAccounts, useAllCategories } from "../../../state/data/hooks";
import { DeleteTransactionSelectionState, SaveTransactionSelectionState } from "../../../state/utilities/actions";
import { formatDate, ID } from "../../../state/utilities/values";
import { Intents } from "../../../styles/colours";
import {
    EditableBooleanValue,
    EditableCurrencyValue,
    EditableTextValue,
    TransactionsTableObjectDropdown,
} from "./inputs";
import { useTransactionsTableStyles } from "./styles";

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
        "& > div:first-child": {
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

export const TransactionsTableEditEntry: React.FC<{ transaction: EditTransactionState; ids: ID[] }> = ({
    transaction: tx,
    ids,
}) => {
    const edit = useTransactionsPageState((state) => state.edit!);

    const classes = useTransactionsTableStyles();
    const editClasses = useEditStyles();

    const categories = useAllCategories();
    const accounts = useAllAccounts();
    const getAccountIcon = useGetAccountIcon();

    return (
        <>
            <div className={classes.date}>
                <DatePicker
                    value={edit.date || null}
                    onChange={onDateChange}
                    format="yyyy-MM-dd"
                    inputVariant="outlined"
                    className={editClasses.centeredInput}
                    size="small"
                    color="primary"
                    disableFuture={true}
                    clearable={tx.date === undefined}
                    emptyLabel="(mixed)"
                    inputProps={edit.date ? undefined : { className: classes.mixed }}
                />
            </div>
            <div className={clsx(classes.text, editClasses.editText)}>
                <EditableTextValue
                    value={edit.summary}
                    placeholder={tx.reference}
                    allowUndefined={tx.summary === undefined}
                    onChange={updateSummary}
                />
                <EditableTextValue
                    value={edit.description}
                    allowUndefined={tx.description === undefined}
                    onChange={updateDescription}
                />
            </div>
            <div className={classes.value}>
                <EditableCurrencyValue
                    currency={edit.currency}
                    value={edit.value}
                    onChangeValue={onChangeValue}
                    onChangeCurrency={onChangeCurrency}
                    allowUndefinedCurrency={tx.currency === undefined}
                    allowUndefinedValue={tx.value === undefined}
                />
            </div>
            <div className={classes.category}>
                <TransactionsTableObjectDropdown
                    options={categories}
                    selected={edit.category}
                    select={onChangeCategory}
                    getIcon={getCategoryIcon}
                    iconClass={editClasses.categoryDropdownIcon}
                    allowUndefined={tx.category === undefined}
                />
            </div>
            <div className={classes.balance}>
                <EditableCurrencyValue
                    currency={edit.currency}
                    value={edit.recordedBalance}
                    placeholder={edit.balance}
                    onChangeValue={onChangeBalance}
                    onChangeCurrency={onChangeCurrency}
                    allowUndefinedCurrency={tx.currency === undefined}
                    allowUndefinedValue={tx.recordedBalance === undefined}
                />
            </div>
            <div className={classes.statement}>
                <EditableBooleanValue
                    value={edit.statement}
                    allowUndefined={tx.statement === undefined}
                    Icon={Description}
                    onSelect={onChangeStatement}
                />
            </div>
            <div className={classes.account}>
                <TransactionsTableObjectDropdown
                    options={accounts}
                    selected={edit.account}
                    select={onChangeAccount}
                    getIcon={getAccountIcon}
                    iconClass={editClasses.accountDropdownIcon}
                    allowUndefined={tx.account === undefined}
                />
            </div>
            <div className={clsx(classes.actions, editClasses.editActions)}>
                <Tooltip title="Save Changes">
                    <IconButton size="small" onClick={onSaveChanges(ids, edit)}>
                        <SaveTwoTone fontSize="small" style={{ color: Intents.success.main }} />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Discard Changes">
                    <IconButton size="small" onClick={onDiscardChanges}>
                        <DeleteTwoTone fontSize="small" style={{ color: Intents.warning.main }} />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Delete Transaction">
                    <IconButton size="small" onClick={onDeleteChanges(ids)}>
                        <CancelTwoTone fontSize="small" color="error" />
                    </IconButton>
                </Tooltip>
            </div>
        </>
    );
};

const onSaveChanges = (ids: ID[], edits: EditTransactionState) => () =>
    TopHatDispatch(SaveTransactionSelectionState({ ids, edits }));
const onDiscardChanges = () => TopHatDispatch(AppSlice.actions.setTransactionsPagePartial({ edit: undefined }));
const onDeleteChanges = (ids: ID[]) => () => TopHatDispatch(DeleteTransactionSelectionState(ids));

const setEditPartial =
    <Key extends keyof Transaction>(key: Key) =>
    (value?: Transaction[Key]) =>
        TopHatDispatch(
            AppSlice.actions.setTransactionsPagePartial({
                edit: { ...(TopHatStore.getState().app.page as TransactionsPageState).edit!, [key]: value },
            })
        );

const onDateChange = (date: DateTime | null) => setEditPartial("date")(date ? formatDate(date) : undefined);
const updateSummary = setEditPartial("summary");
const updateDescription = setEditPartial("description");
const onChangeCurrency = setEditPartial("currency");
const onChangeValue = setEditPartial("value");
const onChangeBalance = setEditPartial("recordedBalance");
const onChangeCategory = setEditPartial("category");
const onChangeStatement = setEditPartial("statement");
const onChangeAccount = setEditPartial("account");
