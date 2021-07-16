import { Avatar, IconButton, Typography } from "@material-ui/core";
import { AccountBalance, Description, Edit, ImportExport } from "@material-ui/icons";
import clsx from "clsx";
import React, { useCallback } from "react";
import { getCategoryIcon } from "../../../components/display/ObjectDisplay";
import { TopHatDispatch } from "../../../state";
import { AppSlice } from "../../../state/app";
import { PartialTransaction } from "../../../state/app/types";
import { PLACEHOLDER_CATEGORY_ID } from "../../../state/data";
import { useAccountByID, useCategoryByID, useCurrencyByID, useInstitutionByID } from "../../../state/data/hooks";
import { parseDate } from "../../../state/utilities/values";
import { formatTransactionsTableNumber, useTransactionsTableStyles } from "./styles";

export const TransactionsTableViewEntry: React.FC<{ transaction: PartialTransaction }> = ({ transaction: tx }) => {
    const classes = useTransactionsTableStyles();
    const currency = useCurrencyByID(tx.currency);
    const category = useCategoryByID(tx.category);
    const account = useAccountByID(tx.account);
    const institution = useInstitutionByID(account?.institution);

    const handleStartEdit = useCallback(
        () => TopHatDispatch(AppSlice.actions.setTransactionsPagePartial({ edit: tx })),
        [tx]
    );

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

    return (
        <>
            <div className={classes.transfer}>
                <ImportExport
                    fontSize="small"
                    style={{ visibility: tx.transfer ? undefined : "hidden" }}
                    className={classes.disabledIcon}
                />
            </div>
            <div className={classes.date}>
                {tx.date ? (
                    <div className={classes.compound}>
                        {parseDate(tx.date).toFormat("MMM d")}
                        <Typography variant="caption" className={classes.subtext}>
                            {parseDate(tx.date).year}
                        </Typography>
                    </div>
                ) : undefined}
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
            <div className={classes.value}>{getCurrencyDisplay(tx.value)}</div>
            <div className={classes.category}>
                {category && category.id !== PLACEHOLDER_CATEGORY_ID ? (
                    <div className={classes.compound}>
                        {getCategoryIcon(category, classes.categoryIcon)}
                        {category.name}
                    </div>
                ) : undefined}
            </div>
            <div className={classes.balance}>
                {getCurrencyDisplay(tx.recordedBalance ?? tx.balance, tx.recordedBalance === undefined)}
            </div>
            <div className={classes.statement}>
                <Description
                    fontSize="small"
                    style={{ visibility: tx.statement ? undefined : "hidden" }}
                    className={classes.disabledIcon}
                />
            </div>
            <div className={classes.account}>
                {account ? (
                    <>
                        <Avatar src={institution?.icon} className={classes.accountIcon}>
                            <AccountBalance style={{ height: "70%" }} />
                        </Avatar>
                        {account.name}
                    </>
                ) : undefined}
            </div>
            <div className={classes.actions}>
                <IconButton size="small" onClick={handleStartEdit}>
                    <Edit fontSize="small" />
                </IconButton>
            </div>
        </>
    );
};
