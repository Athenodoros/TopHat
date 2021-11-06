import styled from "@emotion/styled";
import { CancelTwoTone, DeleteTwoTone, Description, Help, SaveTwoTone } from "@mui/icons-material";
import { Button, IconButton, MenuProps, TextField, Tooltip } from "@mui/material";
import { fromPairs, isEqual, toPairs } from "lodash";
import React, { useCallback, useMemo } from "react";
import { batch } from "react-redux";
import { TopHatDispatch } from "../../../state";
import { Category, DataSlice, Transaction } from "../../../state/data";
import { useAllAccounts, useAllCategories, useAllStatements } from "../../../state/data/hooks";
import { ID, SDate } from "../../../state/shared/values";
import { Greys, Intents } from "../../../styles/colours";
import { SingleCategoryMenu } from "../../display/CategoryMenu";
import { getCategoryIcon, getStatementIcon, useGetAccountIcon } from "../../display/ObjectDisplay";
import { ManagedDatePicker } from "../../inputs";
import { EditableCurrencyValue, EditableTextValue, TransactionsTableObjectDropdown } from "./inputs";
import {
    TransactionTableAccountContainer,
    TransactionTableActionsContainer,
    TransactionTableBalanceContainer,
    TransactionTableCategoryContainer,
    TransactionTableDateContainer,
    TransactionTableStatementContainer,
    TransactionTableSxProps,
    TransactionTableTextContainer,
    TransactionTableValueContainer,
} from "./styles";
import { EditTransactionState, TransactionsTableFixedDataState, TransactionsTableState } from "./types";

export interface TransactionsTableEditEntryProps {
    original?: EditTransactionState;
    edit: EditTransactionState;
    selected: ID[];
    setEditPartial: (update: Partial<EditTransactionState> | null) => void;
    setStatePartial: (update: Partial<TransactionsTableState>) => void;
    fixed?: TransactionsTableFixedDataState;
}

export const TransactionsTableEditEntry: React.FC<TransactionsTableEditEntryProps> = ({
    original: tx,
    selected,
    edit,
    setEditPartial,
    setStatePartial,
    fixed,
}) => {
    const categories = useAllCategories();
    const accounts = useAllAccounts();
    const getAccountIcon = useGetAccountIcon();
    const statements = useAllStatements();

    const actions = useActions(selected, edit, setStatePartial);
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
            <TransactionTableDateContainer>
                <ManagedDatePicker
                    value={edit.date}
                    onChange={updaters.date}
                    nullable={tx !== undefined && tx.date === undefined}
                    disableOpenPicker={true}
                    disableFuture={true}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            size="small"
                            inputProps={{
                                ...params.inputProps,
                                placeholder: "(mixed)",
                            }}
                            sx={{
                                "& input": { textAlign: "center" },
                                ...TransactionTableSxProps.MixedPlaceholder,
                            }}
                        />
                    )}
                />
            </TransactionTableDateContainer>
            <EditTextBox>
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
            </EditTextBox>
            <TransactionTableValueContainer>
                <EditableCurrencyValue
                    currency={edit.currency}
                    value={edit.value}
                    onChangeValue={updaters.value}
                    onChangeCurrency={updaters.currency}
                    allowUndefinedCurrency={!!tx && tx.currency === undefined}
                    allowUndefinedValue={!!tx && tx.value === undefined}
                />
            </TransactionTableValueContainer>
            {fixed?.type !== "category" || fixed.nested === true ? (
                <TransactionTableCategoryContainer>
                    <Tooltip title={edit.value ? "" : "Transaction has no value"}>
                        <CategoryWrapperSpan>
                            <TransactionsTableObjectDropdown
                                options={categories}
                                selected={edit.category}
                                select={updaters.category}
                                getIcon={getCategoryIcon}
                                iconSx={CategoryDropdownIconSx}
                                allowUndefined={!!tx && tx.category === undefined}
                                getMenuContents={getCategoryMenuContents}
                                MenuProps={CategoryMenuProps}
                                disabled={!edit.value}
                            />
                        </CategoryWrapperSpan>
                    </Tooltip>
                </TransactionTableCategoryContainer>
            ) : undefined}
            <TransactionTableBalanceContainer>
                <EditableCurrencyValue
                    currency={edit.currency}
                    value={edit.recordedBalance}
                    placeholder={edit.balance}
                    onChangeValue={updaters.balance}
                    onChangeCurrency={updaters.currency}
                    allowUndefinedCurrency={!!tx && tx.currency === undefined}
                    allowUndefinedValue={!!tx && tx.recordedBalance === undefined}
                />
            </TransactionTableBalanceContainer>
            <TransactionTableStatementContainer>
                <TransactionsTableObjectDropdown
                    options={statements}
                    selected={edit.statement}
                    select={updaters.statement}
                    getIcon={getStatementIcon}
                    iconSx={AccountDropdownIconSx}
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
            </TransactionTableStatementContainer>
            {fixed?.type !== "account" ? (
                <TransactionTableAccountContainer>
                    <TransactionsTableObjectDropdown
                        options={accounts}
                        selected={edit.account}
                        select={updaters.account}
                        getIcon={getAccountIcon}
                        iconSx={AccountDropdownIconSx}
                        allowUndefined={!!tx && tx.account === undefined}
                    />
                </TransactionTableAccountContainer>
            ) : undefined}
            <ActionsBox>
                <Tooltip title="Save Changes">
                    <span>
                        <IconButton size="small" onClick={tx ? actions.save : actions.create}>
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
            </ActionsBox>
        </>
    );
};

const useActions = (
    selected: ID[],
    edit: EditTransactionState,
    setStatePartial: (update: Partial<TransactionsTableState>) => void
) =>
    useMemo(
        () => ({
            create: () =>
                batch(() => {
                    setStatePartial({ edit: undefined });
                    TopHatDispatch(DataSlice.actions.addNewTransaction(edit as Transaction));
                }),
            save: () =>
                batch(() => {
                    setStatePartial({ edit: undefined });
                    TopHatDispatch(
                        DataSlice.actions.updateTransactions(
                            (edit.id === undefined ? selected : [edit.id]).map((id) => ({
                                id,
                                changes: fromPairs(toPairs(edit).filter(([_, value]) => value !== undefined)),
                            }))
                        )
                    );
                }),
            delete: () =>
                batch(() => {
                    setStatePartial({ edit: undefined, selection: [] });
                    TopHatDispatch(DataSlice.actions.deleteTransactions(edit.id === undefined ? selected : [edit.id]));
                }),
        }),
        [setStatePartial, edit, selected]
    );

const useEditUpdaters = (updater: (update: Partial<EditTransactionState> | null) => void) =>
    useMemo(
        () => ({
            // Updates
            date: (date?: SDate) => updater({ date }),
            summary: (summary?: string | null) => updater({ summary }),
            description: (description?: string | null) => updater({ description }),
            currency: (currency?: ID) => updater({ currency }),
            value: (value?: number | null) => updater({ value }),
            balance: (recordedBalance?: number | null) => updater({ recordedBalance }),
            category: (category?: ID) => updater({ category }),
            statement: (statement?: ID) => updater({ statement }),
            account: (account?: ID) => updater({ account }),

            // Actions
            discard: () => updater(null),
        }),
        [updater]
    );

const CategoryMenuProps: Partial<MenuProps> = { PaperProps: { style: { maxHeight: 230, width: 300 } } };
const CategoryDropdownIconSx = {
    height: 16,
    width: 16,
    borderRadius: "50%",
    marginRight: 8,
};
const AccountDropdownIconSx = {
    height: 20,
    width: 20,
    borderRadius: "4px",
    marginRight: 10,
};
const EditTextBox = styled(TransactionTableTextContainer)({
    marginTop: 5,
    marginBottom: 5,

    "& > div": {
        width: "100%",
    },
    "& > div:first-of-type": {
        marginBottom: 5,
    },
});
const ActionsBox = styled(TransactionTableActionsContainer)({ visibility: "visible !important" as "visible" });
const CategoryWrapperSpan = styled("span")({ width: "100%" });
