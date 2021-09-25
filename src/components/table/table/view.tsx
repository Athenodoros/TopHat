import { IconButton, Tooltip, Typography } from "@material-ui/core";
import { Description, Edit, Help } from "@material-ui/icons";
import clsx from "clsx";
import { last } from "lodash";
import React, { useCallback } from "react";
import { EditTransactionState, PLACEHOLDER_CATEGORY_ID } from "../../../state/data";
import {
    useAccountByID,
    useCategoryByID,
    useCurrencyByID,
    useInstitutionByID,
    useStatementByID,
} from "../../../state/data/hooks";
import { PLACEHOLDER_STATEMENT_ID, TRANSFER_CATEGORY_ID } from "../../../state/data/utilities";
import { parseDate } from "../../../state/utilities/values";
import { getCategoryIcon, getInstitutionIcon } from "../../display/ObjectDisplay";
import { formatTransactionsTableNumber, useTransactionsTableStyles } from "./styles";
import { TransactionsTableFixedDataState, TransactionsTableState } from "./types";

export interface TransactionsTableViewEntryProps {
    transaction: EditTransactionState;
    updateState: (update: Partial<TransactionsTableState>) => void;
    fixed?: TransactionsTableFixedDataState;
}
export const TransactionsTableViewEntry: React.FC<TransactionsTableViewEntryProps> = ({
    transaction: tx,
    updateState,
    fixed,
}) => {
    const classes = useTransactionsTableStyles();
    const currency = useCurrencyByID(tx.currency);
    const category = useCategoryByID(tx.category);
    const account = useAccountByID(tx.account);
    const institution = useInstitutionByID(account?.institution);
    const statement = useStatementByID(tx.statement);

    const topLevelCategory = useCategoryByID(category && last(category.hierarchy));

    const handleStartEdit = useCallback(() => updateState({ edit: tx }), [updateState, tx]);

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

    const MissingText = (
        <Typography variant="body1" noWrap={true} className={classes.mixed}>
            (mixed)
        </Typography>
    );

    return (
        <>
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
                    <div className={clsx(classes.compound, category.id === TRANSFER_CATEGORY_ID && classes.transfer)}>
                        {getCategoryIcon(category, classes.categoryIcon)}
                        {(topLevelCategory ? topLevelCategory.name + ": " : "") + category.name}
                    </div>
                ) : category === undefined ? (
                    MissingText
                ) : undefined}
            </div>
            <div className={classes.balance}>
                {getCurrencyDisplay(tx.recordedBalance ?? tx.balance, tx.recordedBalance === null)}
            </div>
            <div className={classes.statement}>
                {statement ? (
                    <Tooltip title={statement.name}>
                        <Description
                            fontSize="small"
                            style={{
                                visibility: statement.id !== PLACEHOLDER_STATEMENT_ID ? undefined : "hidden",
                            }}
                            className={classes.disabledIcon}
                        />
                    </Tooltip>
                ) : (
                    <Tooltip title="(mixed)">
                        <Help fontSize="small" className={classes.disabledIcon} />
                    </Tooltip>
                )}
            </div>
            {fixed?.type !== "account" ? (
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
            ) : undefined}
            <div className={classes.actions}>
                <IconButton size="small" onClick={handleStartEdit}>
                    <Edit fontSize="small" />
                </IconButton>
            </div>
        </>
    );
};
