import { Avatar, Checkbox, IconButton, Typography } from "@material-ui/core";
import { AccountBalance, Description, Edit, ImportExport } from "@material-ui/icons";
import clsx from "clsx";
import { noop } from "lodash-es";
import React from "react";
import {
    useAccountByID,
    useCategoryByID,
    useCurrencyByID,
    useInstitutionByID,
    useTransactionByID,
} from "../../../state/data/hooks";
import { ID, parseDate } from "../../../state/utilities/values";
import { formatTransactionsTableNumber, getIconStyles, useTransactionsTableStyles } from "./styles";

export const TransactionsTableEntry: React.FC<{ id: ID }> = ({ id }) => {
    const classes = useTransactionsTableStyles();
    const tx = useTransactionByID(id);
    const currency = useCurrencyByID(tx.currency);
    const category = useCategoryByID(tx.category);
    const account = useAccountByID(tx.account);
    const institution = useInstitutionByID(account.institution);

    return (
        <div className={clsx(classes.container, classes.rowContainer)}>
            <div className={classes.checkbox}>
                <Checkbox checked={false} onChange={noop} color="primary" />
            </div>
            <div className={classes.transfer}>
                <IconButton size="small" disabled={true}>
                    <ImportExport fontSize="small" style={{ visibility: tx.transfer ? undefined : "hidden" }} />
                </IconButton>
            </div>
            <div className={classes.date}>
                <div className={classes.compound}>
                    {parseDate(tx.date).toFormat("MMM d")}
                    <Typography variant="caption" className={classes.subtext}>
                        {parseDate(tx.date).year}
                    </Typography>
                </div>
            </div>
            <div className={classes.text}>
                <Typography variant="body1" noWrap={true} className={classes.summary}>
                    {tx.summary || tx.reference}
                </Typography>
                {tx.description ? (
                    <Typography variant="caption" className={classes.description} component="div">
                        {tx.description}
                    </Typography>
                ) : undefined}
            </div>
            <div className={classes.value}>
                {tx.value !== undefined ? (
                    <div className={classes.compound}>
                        <Typography variant="caption" className={classes.subtext}>
                            {currency.symbol}
                        </Typography>
                        {formatTransactionsTableNumber(tx.value)}
                    </div>
                ) : undefined}
            </div>
            <div className={classes.category}>
                {category ? (
                    <div className={classes.compound}>
                        <div className={classes.categoryIcon} style={getIconStyles(category?.colour)} />
                        {category.name}
                    </div>
                ) : undefined}
            </div>
            <div className={classes.balance}>
                <div className={classes.compound}>
                    <Typography
                        variant="body2"
                        className={clsx(classes.subtext, tx.recordedBalance === undefined && classes.missing)}
                    >
                        {currency.symbol}
                    </Typography>
                    <Typography
                        variant="body1"
                        className={tx.recordedBalance === undefined ? classes.missing : undefined}
                    >
                        {formatTransactionsTableNumber(tx.recordedBalance ?? tx.balance!)}
                    </Typography>
                </div>
            </div>
            <div className={classes.statement}>
                <IconButton size="small" disabled={true}>
                    <Description fontSize="small" style={{ visibility: tx.statement ? undefined : "hidden" }} />
                </IconButton>
            </div>
            <div className={classes.account}>
                <Avatar src={institution?.icon} className={classes.accountIcon}>
                    <AccountBalance style={{ height: "70%" }} />
                </Avatar>
                {account.name}
            </div>
            <div className={classes.actions}>
                <IconButton size="small">
                    <Edit fontSize="small" />
                </IconButton>
            </div>
        </div>
    );
};
