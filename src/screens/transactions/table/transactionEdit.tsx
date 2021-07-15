import { Button, IconButton, makeStyles, Menu, MenuItem, TextField, Tooltip, Typography } from "@material-ui/core";
import { Cancel, Delete, Description, ImportExport, Save } from "@material-ui/icons";
import { DatePicker } from "@material-ui/pickers";
import clsx from "clsx";
import { noop } from "lodash";
import React from "react";
import { getCategoryIcon, useGetAccountIcon } from "../../../components/display/ObjectDisplay";
import { Account, Category, PLACEHOLDER_CATEGORY_ID, Transaction } from "../../../state/data";
import { useAllAccounts, useAllCategories, useCurrencyByID } from "../../../state/data/hooks";
import { Intents } from "../../../styles/colours";
import { useFirstValue, usePopoverProps } from "../../../utilities/hooks";
import { formatTransactionsTableNumber, useTransactionsTableStyles } from "./styles";

const useEditStyles = makeStyles({
    centeredInput: {
        "& input": {
            textAlign: "center",
        },
    },
    editText: {
        marginTop: 5,
        marginBottom: 5,

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
    const classes = useTransactionsTableStyles();
    const editClasses = useEditStyles();
    const currency = useCurrencyByID(tx.currency);

    const categories = useAllCategories();
    const accounts = useAllAccounts();
    const getAccountIcon = useGetAccountIcon();
    const renderAccount = (account: Account) => (
        <>
            {getAccountIcon(account, editClasses.accountDropdownIcon)}
            <Typography variant="body1">{account.name}</Typography>
        </>
    );
    const renderCategory = (category: Category) => (
        <>
            {getCategoryIcon(category, editClasses.categoryDropdownIcon)}
            <Typography variant="body1">{category.name}</Typography>
        </>
    );
    const currentCategorySelection = categories.find((category) => category.id === tx.category);

    const AccountPopoverState = usePopoverProps();
    const CategoryPopoverState = usePopoverProps();

    const getCurrencyDisplay = (value: number | undefined, missing?: boolean) =>
        value !== undefined ? (
            <div className={classes.compound}>
                {currency && (
                    <Typography
                        variant="caption"
                        className={clsx(classes.subtext, missing ? classes.missing : undefined)}
                    >
                        {currency.symbol}
                    </Typography>
                )}
                <Typography variant="body1" className={missing ? classes.missing : undefined}>
                    {formatTransactionsTableNumber(value)}
                </Typography>
            </div>
        ) : undefined;

    const summaryDefault = useFirstValue(tx.summary);

    return (
        <>
            <div className={classes.transfer}>
                <Button
                    variant="outlined"
                    // color="default"
                    endIcon={
                        <ImportExport
                            fontSize="small"
                            style={{ color: tx.transfer ? Intents.primary.main : "transparent" }}
                        />
                    }
                    onClick={noop}
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
                    clearable={true}
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
            <div className={classes.value}>{getCurrencyDisplay(tx.value)}</div>
            <div className={classes.category}>
                <Button
                    variant="outlined"
                    color="primary"
                    {...CategoryPopoverState.buttonProps}
                    className={editClasses.selectButton}
                >
                    {currentCategorySelection && currentCategorySelection.id !== PLACEHOLDER_CATEGORY_ID
                        ? renderCategory(currentCategorySelection)
                        : undefined}
                </Button>
                <Menu {...CategoryPopoverState.popoverProps} style={{ maxHeight: 250 }}>
                    {categories.map((category) => (
                        <MenuItem key={category.id}>{renderCategory(category)}</MenuItem>
                    ))}
                </Menu>
            </div>
            <div className={classes.balance}>
                {getCurrencyDisplay(tx.recordedBalance ?? tx.balance, tx.recordedBalance === undefined)}
            </div>
            <div className={classes.statement}>
                <Button
                    variant="outlined"
                    color="primary"
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
                <Button
                    variant="outlined"
                    color="primary"
                    {...AccountPopoverState.buttonProps}
                    className={editClasses.selectButton}
                >
                    {renderAccount(accounts.find((account) => account.id === tx.account)!)}
                </Button>
                <Menu {...AccountPopoverState.popoverProps} style={{ maxHeight: 250 }}>
                    {accounts.map((account) => (
                        <MenuItem key={account.id}>{renderAccount(account)}</MenuItem>
                    ))}
                </Menu>
            </div>
            <div className={clsx(classes.actions, editClasses.editActions)}>
                <Tooltip title="Save Changes">
                    <IconButton size="small" onClick={noop}>
                        <Save fontSize="small" style={{ color: Intents.success.main }} />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Discard Changes">
                    <IconButton size="small" onClick={noop}>
                        <Delete fontSize="small" style={{ color: Intents.warning.main }} />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Delete Transaction">
                    <IconButton size="small" onClick={noop}>
                        <Cancel fontSize="small" color="error" />
                    </IconButton>
                </Tooltip>
            </div>
        </>
    );
};
