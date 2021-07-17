import { IconButton, Typography } from "@material-ui/core";
import { Description, Edit, Help, ImportExport } from "@material-ui/icons";
import clsx from "clsx";
import React, { useCallback } from "react";
import { getCategoryIcon, getInstitutionIcon } from "../../../components/display/ObjectDisplay";
import { TopHatDispatch } from "../../../state";
import { AppSlice } from "../../../state/app";
import { EditTransactionState } from "../../../state/app/types";
import { PLACEHOLDER_CATEGORY_ID } from "../../../state/data";
import { useAccountByID, useCategoryByID, useCurrencyByID, useInstitutionByID } from "../../../state/data/hooks";
import { parseDate } from "../../../state/utilities/values";
import { IconType } from "../../../utilities/types";
import { formatTransactionsTableNumber, useTransactionsTableStyles } from "./styles";

export const TransactionsTableViewEntry: React.FC<{ transaction: EditTransactionState }> = ({ transaction: tx }) => {
    const classes = useTransactionsTableStyles();
    const currency = useCurrencyByID(tx.currency);
    const category = useCategoryByID(tx.category);
    const account = useAccountByID(tx.account);
    const institution = useInstitutionByID(account?.institution);

    const handleStartEdit = useCallback(
        () => TopHatDispatch(AppSlice.actions.setTransactionsPagePartial({ edit: tx })),
        [tx]
    );

    const getCurrencyDisplay = (value: number | null | undefined, missing?: boolean) =>
        value !== undefined && value !== null ? (
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
        ) : value === undefined ? (
            <Typography variant="body1" noWrap={true} className={classes.mixed}>
                (mixed)
            </Typography>
        ) : undefined;

    const getIcon = (value: boolean | undefined, Icon: IconType) =>
        value !== undefined ? (
            <Icon
                fontSize="small"
                style={{
                    visibility: value ? undefined : "hidden",
                }}
                className={classes.disabledIcon}
            />
        ) : (
            <Help fontSize="small" className={classes.disabledIcon} />
        );

    const MissingText = (
        <Typography variant="body1" noWrap={true} className={classes.mixed}>
            (mixed)
        </Typography>
    );

    return (
        <>
            <div className={classes.transfer}>{getIcon(tx.transfer, ImportExport)}</div>
            <div className={classes.date}>
                {tx.date ? (
                    <div className={classes.compound}>
                        {parseDate(tx.date).toFormat("MMM d")}
                        <Typography variant="caption" className={classes.subtext}>
                            {parseDate(tx.date).year}
                        </Typography>
                    </div>
                ) : (
                    MissingText
                )}
            </div>
            <div className={classes.text}>
                {(tx.summary || tx.reference) !== undefined ? (
                    <>
                        <Typography variant="body1" noWrap={true} className={classes.summary}>
                            {tx.summary || tx.reference}
                        </Typography>
                        {tx.description ? (
                            <Typography variant="caption" className={classes.description} component="div">
                                {tx.description}
                            </Typography>
                        ) : undefined}
                    </>
                ) : (
                    MissingText
                )}
            </div>
            <div className={classes.value}>{getCurrencyDisplay(tx.value)}</div>
            <div className={classes.category}>
                {category && category.id !== PLACEHOLDER_CATEGORY_ID ? (
                    <div className={classes.compound}>
                        {getCategoryIcon(category, classes.categoryIcon)}
                        {category.name}
                    </div>
                ) : category === undefined ? (
                    MissingText
                ) : undefined}
            </div>
            <div className={classes.balance}>
                {getCurrencyDisplay(tx.recordedBalance ?? tx.balance, tx.recordedBalance === null)}
            </div>
            <div className={classes.statement}>{getIcon(tx.statement, Description)}</div>
            <div className={classes.account}>
                {account && institution ? (
                    <>
                        {getInstitutionIcon(institution, classes.accountIcon)}
                        {account.name}
                    </>
                ) : (
                    MissingText
                )}
            </div>
            <div className={classes.actions}>
                <IconButton size="small" onClick={handleStartEdit}>
                    <Edit fontSize="small" />
                </IconButton>
            </div>
        </>
    );
};
