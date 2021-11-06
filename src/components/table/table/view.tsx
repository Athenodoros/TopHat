import styled from "@emotion/styled";
import { Description, Edit, Help } from "@mui/icons-material";
import { IconButton, Tooltip, Typography } from "@mui/material";
import { Box } from "@mui/system";
import { last } from "lodash";
import React, { useCallback } from "react";
import { PLACEHOLDER_CATEGORY_ID } from "../../../state/data";
import {
    useAccountByID,
    useCategoryByID,
    useCurrencyByID,
    useInstitutionByID,
    useStatementByID,
} from "../../../state/data/hooks";
import { PLACEHOLDER_STATEMENT_ID, TRANSFER_CATEGORY_ID } from "../../../state/data/shared";
import { parseDate } from "../../../state/shared/values";
import { Greys } from "../../../styles/colours";
import { getCategoryIcon, getInstitutionIcon } from "../../display/ObjectDisplay";
import {
    formatTransactionsTableNumber,
    TransactionsTableSummaryTypography,
    TransactionTableAccountContainer,
    TransactionTableActionsContainer,
    TransactionTableBalanceContainer,
    TransactionTableCategoryContainer,
    TransactionTableCompoundContainer,
    TransactionTableDateContainer,
    TransactionTableMixedTypography,
    TransactionTableStatementContainer,
    TransactionTableSxProps,
    TransactionTableTextContainer,
    TransactionTableValueContainer,
} from "./styles";
import { EditTransactionState, TransactionsTableFixedDataState, TransactionsTableState } from "./types";

export interface TransactionsTableViewEntryProps {
    transaction: EditTransactionState;
    updateState: (update: Partial<TransactionsTableState>) => void;
    fixed?: TransactionsTableFixedDataState;
}
export const TransactionsTableViewEntry: React.FC<TransactionsTableViewEntryProps> = React.memo(
    ({ transaction: tx, updateState, fixed }) => {
        const currency = useCurrencyByID(tx.currency);
        const category = useCategoryByID(tx.category);
        const account = useAccountByID(tx.account);
        const institution = useInstitutionByID(account?.institution);
        const statement = useStatementByID(tx.statement);

        const topLevelCategory = useCategoryByID(category && last(category.hierarchy));

        const handleStartEdit = useCallback(() => updateState({ edit: tx }), [updateState, tx]);

        const getCurrencyDisplay = (value: number | null | undefined, missing?: boolean) =>
            value !== undefined && value !== null ? (
                <TransactionTableCompoundContainer>
                    {currency && (
                        <SubtextTypography
                            variant="caption"
                            sx={missing ? TransactionTableSxProps.MissingValue : undefined}
                        >
                            {currency.symbol}
                        </SubtextTypography>
                    )}
                    <Typography variant="body1" sx={missing ? TransactionTableSxProps.MissingValue : undefined}>
                        {formatTransactionsTableNumber(value)}
                    </Typography>
                </TransactionTableCompoundContainer>
            ) : value === undefined ? (
                MissingText
            ) : undefined;

        return (
            <>
                <TransactionTableDateContainer>
                    {tx.date ? (
                        <TransactionTableCompoundContainer>
                            <Typography variant="body1">{parseDate(tx.date).toFormat("MMM d")}</Typography>
                            <SubtextTypography variant="caption">{parseDate(tx.date).year}</SubtextTypography>
                        </TransactionTableCompoundContainer>
                    ) : (
                        MissingText
                    )}
                </TransactionTableDateContainer>
                <TransactionTableTextContainer>
                    {(tx.summary || tx.reference) !== undefined ? (
                        <>
                            <Box
                                sx={{
                                    marginLeft: -3,
                                    padding: "0 3px",
                                    borderRadius: "2px",
                                    "&:hover": {
                                        width: "min-content",
                                        background: Greys[100],
                                        position: "relative",
                                        zIndex: 1,
                                    },
                                }}
                            >
                                <TransactionsTableSummaryTypography variant="body1" noWrap={true}>
                                    {tx.summary || tx.reference}
                                </TransactionsTableSummaryTypography>
                            </Box>
                            {tx.description ? (
                                <Typography variant="caption" sx={DescriptionTypographySx} component="div">
                                    {tx.description}
                                </Typography>
                            ) : undefined}
                        </>
                    ) : (
                        MissingText
                    )}
                </TransactionTableTextContainer>
                <TransactionTableValueContainer>
                    {getCurrencyDisplay(tx.value || 0, tx.value === null)}
                </TransactionTableValueContainer>
                {fixed?.type !== "category" || fixed.nested === true ? (
                    <TransactionTableCategoryContainer>
                        {category && category.id !== PLACEHOLDER_CATEGORY_ID ? (
                            <TransactionTableCompoundContainer
                                sx={category.id === TRANSFER_CATEGORY_ID ? TransferCategorySx : undefined}
                            >
                                {getCategoryIcon(category, CategoryIconSx)}
                                <Typography noWrap={true}>
                                    {(topLevelCategory ? topLevelCategory.name + ": " : "") + category.name}
                                </Typography>
                            </TransactionTableCompoundContainer>
                        ) : category === undefined ? (
                            MissingText
                        ) : undefined}
                    </TransactionTableCategoryContainer>
                ) : undefined}
                <TransactionTableBalanceContainer>
                    {getCurrencyDisplay(tx.recordedBalance ?? tx.balance, tx.recordedBalance === null)}
                </TransactionTableBalanceContainer>
                <TransactionTableStatementContainer>
                    {statement ? (
                        <Tooltip title={statement.name}>
                            <StatementDescriptionIcon
                                fontSize="small"
                                sx={statement.id === PLACEHOLDER_STATEMENT_ID ? { visibility: "hidden" } : undefined}
                            />
                        </Tooltip>
                    ) : (
                        <Tooltip title="(mixed)">
                            <StatementHelpIcon fontSize="small" />
                        </Tooltip>
                    )}
                </TransactionTableStatementContainer>
                {fixed?.type !== "account" ? (
                    <TransactionTableAccountContainer>
                        {account && institution ? (
                            <>
                                {getInstitutionIcon(institution, InstitutionIconSx)}
                                {account.name}
                            </>
                        ) : (
                            MissingText
                        )}
                    </TransactionTableAccountContainer>
                ) : undefined}
                <TransactionTableActionsContainer>
                    <IconButton size="small" onClick={handleStartEdit}>
                        <Edit fontSize="small" />
                    </IconButton>
                </TransactionTableActionsContainer>
            </>
        );
    }
);

const SubtextTypography = styled(Typography)({
    color: Greys[500],
    alignSelf: "flex-end",
    margin: "0 4px 9px 4px",
    lineHeight: 1,
});
const DescriptionTypographySx = { marginTop: 5, lineHeight: 1.4, color: Greys[700], wordBreak: "break-word" as const };
const MissingText = (
    <TransactionTableMixedTypography variant="body1" noWrap={true}>
        (mixed)
    </TransactionTableMixedTypography>
);
const CategoryIconSx = {
    height: 16,
    width: 16,
    flexShrink: 0,
    borderRadius: "50%",
    marginRight: 6,
};
const TransferCategorySx = {
    fontStyle: "italic",
    color: Greys[600],
    overflow: "visible",
};
const StatementDescriptionIcon = styled(Description)({ opacity: 0.3 });
const StatementHelpIcon = styled(Help)({ opacity: 0.3 });
const InstitutionIconSx = {
    height: 18,
    width: 18,
    borderRadius: "5px",
    marginRight: 6,
};
