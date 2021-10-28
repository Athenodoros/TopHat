import styled from "@emotion/styled";
import { AccountBalance, Block, Description, ImportExport } from "@mui/icons-material";
import { Avatar, Typography } from "@mui/material";
import { Box, SxProps } from "@mui/system";
import chroma from "chroma-js";
import { last } from "lodash";
import React, { useCallback } from "react";
import { Institution } from "../../state/data";
import { getCategoryColour, useInstitutionMap } from "../../state/data/hooks";
import { PLACEHOLDER_CATEGORY_ID, PLACEHOLDER_STATEMENT_ID, TRANSFER_CATEGORY_ID } from "../../state/data/shared";
import { Account, AccountTypes, Category, Currency, Statement } from "../../state/data/types";
import { Greys } from "../../styles/colours";

export function fadeSolidColour(colour: string): string;
export function fadeSolidColour(colour: string | undefined): string | undefined;
export function fadeSolidColour(colour: string | undefined) {
    return colour && chroma(colour).alpha(0.5).hex();
}

const AccountBalanceIcon = styled(AccountBalance)({ height: "60%" });
export const useGetAccountIcon = () => {
    const institutions = useInstitutionMap();

    return useCallback(
        (account: Account | undefined, sx: SxProps) => (
            <Avatar src={institutions[account?.institution!]?.icon} sx={sx}>
                <AccountBalanceIcon />
            </Avatar>
        ),
        [institutions]
    );
};
export const getInstitutionIcon = (institution: Institution, sx: SxProps) => (
    <Avatar src={institution.icon} sx={sx}>
        <AccountBalanceIcon />
    </Avatar>
);
export const getCategoryIcon = (category: Pick<Category, "id" | "colour">, sx: SxProps) =>
    category.id === TRANSFER_CATEGORY_ID ? (
        <Avatar sx={{ backgroundColor: "transparent", ...sx }}>
            <ImportExport sx={{ height: "90%", color: category.colour }} />
        </Avatar>
    ) : category.id === PLACEHOLDER_CATEGORY_ID ? (
        <Avatar sx={{ backgroundColor: "transparent", ...sx }}>
            <Block sx={{ height: "90%", color: category.colour }} />
        </Avatar>
    ) : (
        <Box
            sx={{
                borderRadius: "50%",
                border: "1px solid " + getCategoryColour(category.id),
                background: fadeSolidColour(getCategoryColour(category.id)),
                ...sx,
            }}
        />
    );
export const getAccountCategoryIcon = (type: typeof AccountTypes[number], sx: SxProps) => (
    <Avatar sx={sx} style={{ backgroundColor: type.colour }}>
        <type.icon sx={{ height: "60%" }} />
    </Avatar>
);
export const getCurrencyIcon = (currency: Currency, sx: SxProps) => (
    <Avatar sx={sx} style={{ backgroundColor: currency.colour }}>
        <Typography variant="button">{last(currency.symbol)}</Typography>
    </Avatar>
);
const DescriptionDefaultIcon = styled(Description)({ height: "90%", color: Greys[500] });
const DescriptionInvertIcon = styled(Description)({ height: "60%", color: Greys[100] });
const BlockDefaultIcon = styled(Block)({ height: "90%", color: Greys[500] });
const BlockInvertIcon = styled(Block)({ height: "60%", color: Greys[100] });
export const getStatementIcon = (statement: Statement, sx: SxProps, invert?: boolean) => (
    <Avatar sx={sx} style={{ backgroundColor: invert ? Greys[500] : "transparent" }}>
        {statement.id !== PLACEHOLDER_STATEMENT_ID ? (
            invert ? (
                <DescriptionInvertIcon />
            ) : (
                <DescriptionDefaultIcon />
            )
        ) : invert ? (
            <BlockInvertIcon />
        ) : (
            <BlockDefaultIcon />
        )}
    </Avatar>
);
