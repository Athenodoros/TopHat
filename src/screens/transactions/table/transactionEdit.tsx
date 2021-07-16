import { Button, IconButton, makeStyles, TextField, Tooltip } from "@material-ui/core";
import { CancelTwoTone, DeleteTwoTone, Description, ImportExport, SaveTwoTone } from "@material-ui/icons";
import { DatePicker } from "@material-ui/pickers";
import clsx from "clsx";
import { noop } from "lodash";
import React from "react";
import { getCategoryIcon, useGetAccountIcon } from "../../../components/display/ObjectDisplay";
import { TopHatDispatch, TopHatStore } from "../../../state";
import { AppSlice } from "../../../state/app";
import { TransactionsPageState } from "../../../state/app/types";
import { Transaction } from "../../../state/data";
import { useAllAccounts, useAllCategories, useCurrencyByID } from "../../../state/data/hooks";
import { Intents } from "../../../styles/colours";
import { useFirstValue } from "../../../utilities/hooks";
import { EditableCurrencyValue, TransactionsTableObjectDropdown } from "./inputs";
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

export const TransactionsTableEditEntry: React.FC<{ transaction: Transaction }> = ({ transaction: tx }) => {
    // const edit = useTransactionsPageState(state => state.edit);

    const classes = useTransactionsTableStyles();
    const editClasses = useEditStyles();
    const currency = useCurrencyByID(tx.currency);

    const categories = useAllCategories();
    const accounts = useAllAccounts();
    const getAccountIcon = useGetAccountIcon();
    const summaryDefault = useFirstValue(tx.summary);

    return (
        <>
            <div className={classes.transfer}>
                <Button
                    variant="outlined"
                    endIcon={
                        <ImportExport
                            fontSize="small"
                            style={{ color: tx.transfer ? Intents.primary.main : "transparent" }}
                        />
                    }
                    onClick={toggleTransfer}
                />
            </div>
            <div className={classes.date}>
                <DatePicker
                    value={tx.date}
                    onChange={noop}
                    format="yyyy-MM-dd"
                    inputVariant="outlined"
                    className={editClasses.centeredInput}
                    size="small"
                    color="primary"
                    disableFuture={true}
                />
            </div>
            <div className={clsx(classes.text, editClasses.editText)}>
                <TextField
                    size="small"
                    variant="outlined"
                    placeholder={tx.reference}
                    defaultValue={summaryDefault}
                    onChange={noop}
                />
                <TextField
                    size="small"
                    variant="outlined"
                    multiline={true}
                    defaultValue={summaryDefault}
                    onChange={noop}
                />
            </div>
            <div className={classes.value}>
                <EditableCurrencyValue
                    currency={currency}
                    value={tx.value}
                    onChange={(...args: any[]) => console.log(...args)}
                />
            </div>
            <div className={classes.category}>
                <TransactionsTableObjectDropdown
                    options={categories}
                    selected={tx.category}
                    select={(...args: any[]) => console.log(...args)}
                    getIcon={getCategoryIcon}
                    iconClass={editClasses.categoryDropdownIcon}
                />
            </div>
            <div className={classes.balance}>
                <EditableCurrencyValue
                    currency={currency}
                    value={tx.recordedBalance}
                    placeholder={tx.balance}
                    onChange={(...args: any[]) => console.log(...args)}
                />
            </div>
            <div className={classes.statement}>
                <Button
                    variant="outlined"
                    endIcon={
                        <Description
                            fontSize="small"
                            style={{ color: tx.statement ? Intents.primary.main : "transparent" }}
                        />
                    }
                    onClick={noop}
                />
            </div>
            <div className={classes.account}>
                <TransactionsTableObjectDropdown
                    options={accounts}
                    selected={tx.account}
                    select={(...args: any[]) => console.log(...args)}
                    getIcon={getAccountIcon}
                    iconClass={editClasses.accountDropdownIcon}
                />
            </div>
            <div className={clsx(classes.actions, editClasses.editActions)}>
                <Tooltip title="Save Changes">
                    <IconButton size="small" onClick={noop}>
                        <SaveTwoTone fontSize="small" style={{ color: Intents.success.main }} />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Discard Changes">
                    <IconButton size="small" onClick={onDiscardChanges}>
                        <DeleteTwoTone fontSize="small" style={{ color: Intents.warning.main }} />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Delete Transaction">
                    <IconButton size="small" onClick={noop}>
                        <CancelTwoTone fontSize="small" color="error" />
                    </IconButton>
                </Tooltip>
            </div>
        </>
    );
};

const getCurrentEdit = () => (TopHatStore.getState().app.page as TransactionsPageState).edit!;
const setEditPartial = <Key extends keyof Transaction>(key: Key, value?: Transaction[Key]) =>
    TopHatDispatch(
        AppSlice.actions.setTransactionsPagePartial({
            edit: { ...getCurrentEdit(), [key]: value },
        })
    );

const toggleTransfer = () => setEditPartial("transfer", !getCurrentEdit()?.transfer);

const onDiscardChanges = () => TopHatDispatch(AppSlice.actions.setTransactionsPagePartial({ edit: undefined }));
