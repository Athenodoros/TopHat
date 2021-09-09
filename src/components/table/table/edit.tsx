import { Button, IconButton, makeStyles, Tooltip } from "@material-ui/core";
import { CancelTwoTone, DeleteTwoTone, Description, Help, SaveTwoTone } from "@material-ui/icons";
import { DatePicker } from "@material-ui/pickers";
import clsx from "clsx";
import { DateTime } from "luxon";
import React, { useMemo } from "react";
import { TopHatDispatch } from "../../../state";
import { EditTransactionState } from "../../../state/app/pageTypes";
import { useAllAccounts, useAllCategories, useAllStatements } from "../../../state/data/hooks";
import { DeleteTransactionSelectionState, SaveTransactionTableSelectionState } from "../../../state/utilities/actions";
import { formatDate, ID } from "../../../state/utilities/values";
import { Greys, Intents } from "../../../styles/colours";
import { getCategoryIcon, getStatementIcon, useGetAccountIcon } from "../../display/ObjectDisplay";
import { TransactionsTableFixedData } from "./data";
import { EditableCurrencyValue, EditableTextValue, TransactionsTableObjectDropdown } from "./inputs";
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

export interface TransactionsTableEditEntryProps {
    original: EditTransactionState;
    edit: EditTransactionState;
    ids: ID[];
    setEditPartial: (update: Partial<EditTransactionState> | null) => void;
    fixed?: TransactionsTableFixedData;
}
export const TransactionsTableEditEntry: React.FC<TransactionsTableEditEntryProps> = ({
    original: tx,
    ids,
    edit,
    setEditPartial,
    fixed,
}) => {
    const classes = useTransactionsTableStyles();
    const editClasses = useEditStyles();

    const categories = useAllCategories();
    const accounts = useAllAccounts();
    const getAccountIcon = useGetAccountIcon();
    const statements = useAllStatements();

    const updaters = useEditUpdaters(setEditPartial);

    return (
        <>
            <div className={classes.date}>
                <DatePicker
                    value={edit.date || null}
                    onChange={updaters.date}
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
                    onChange={updaters.summary}
                />
                <EditableTextValue
                    value={edit.description}
                    allowUndefined={tx.description === undefined}
                    onChange={updaters.description}
                />
            </div>
            <div className={classes.value}>
                <EditableCurrencyValue
                    currency={edit.currency}
                    value={edit.value}
                    onChangeValue={updaters.value}
                    onChangeCurrency={updaters.currency}
                    allowUndefinedCurrency={tx.currency === undefined}
                    allowUndefinedValue={tx.value === undefined}
                />
            </div>
            <div className={classes.category}>
                <TransactionsTableObjectDropdown
                    options={categories}
                    selected={edit.category}
                    select={updaters.category}
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
                    onChangeValue={updaters.balance}
                    onChangeCurrency={updaters.currency}
                    allowUndefinedCurrency={tx.currency === undefined}
                    allowUndefinedValue={tx.recordedBalance === undefined}
                />
            </div>
            <div className={classes.statement}>
                <TransactionsTableObjectDropdown
                    options={statements}
                    selected={edit.statement}
                    select={updaters.statement}
                    getIcon={getStatementIcon}
                    iconClass={editClasses.accountDropdownIcon}
                    allowUndefined={tx.statement === undefined}
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
                        />
                    }
                />
            </div>
            {fixed?.type === "account" ? (
                <div className={classes.account}>
                    <TransactionsTableObjectDropdown
                        options={accounts}
                        selected={edit.account}
                        select={updaters.account}
                        getIcon={getAccountIcon}
                        iconClass={editClasses.accountDropdownIcon}
                        allowUndefined={tx.account === undefined}
                    />
                </div>
            ) : undefined}
            <div className={clsx(classes.actions, editClasses.editActions)}>
                <Tooltip title="Save Changes">
                    <IconButton size="small" onClick={onSaveChanges(ids, edit)}>
                        <SaveTwoTone fontSize="small" htmlColor={Intents.success.main} />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Discard Changes">
                    <IconButton size="small" onClick={updaters.discard}>
                        <DeleteTwoTone fontSize="small" htmlColor={Intents.warning.main} />
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
    TopHatDispatch(SaveTransactionTableSelectionState({ ids, edits }));
const onDeleteChanges = (ids: ID[]) => () => TopHatDispatch(DeleteTransactionSelectionState(ids));

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
