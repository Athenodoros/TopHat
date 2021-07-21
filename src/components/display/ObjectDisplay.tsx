import { Avatar, Typography } from "@material-ui/core";
import { AccountBalance, HelpOutline, ImportExport } from "@material-ui/icons";
import chroma from "chroma-js";
import { last } from "lodash";
import React, { useCallback } from "react";
import { Institution } from "../../state/data";
import { useInstitutionMap } from "../../state/data/hooks";
import { Account, AccountTypes, Category, Currency } from "../../state/data/types";
import { PLACEHOLDER_CATEGORY_ID, TRANSFER_CATEGORY_ID } from "../../state/data/utilities";

export function fadeSolidColour(colour: string): string;
export function fadeSolidColour(colour: string | undefined): string | undefined;
export function fadeSolidColour(colour: string | undefined) {
    return colour && chroma(colour).alpha(0.5).hex();
}

export const useGetAccountIcon = () => {
    const institutions = useInstitutionMap();

    return useCallback(
        (account: Account, className: string) => (
            <Avatar src={institutions[account.institution!]!.icon} className={className}>
                <AccountBalance style={{ height: "60%" }} />
            </Avatar>
        ),
        [institutions]
    );
};
export const getInstitutionIcon = (institution: Institution, className: string) => (
    <Avatar src={institution.icon} className={className}>
        <AccountBalance style={{ height: "60%" }} />
    </Avatar>
);
export const getCategoryIcon = (category: Category, className: string) =>
    category.id === TRANSFER_CATEGORY_ID ? (
        <Avatar className={className} style={{ backgroundColor: "transparent" }}>
            <ImportExport style={{ height: "100%", color: category.colour }} />
        </Avatar>
    ) : category.id === PLACEHOLDER_CATEGORY_ID ? (
        <Avatar className={className} style={{ backgroundColor: "transparent" }}>
            <HelpOutline style={{ height: "100%", color: category.colour }} />
        </Avatar>
    ) : (
        <div
            className={className}
            style={{
                borderRadius: "50%",
                border: "1px solid " + category.colour,
                background: fadeSolidColour(category.colour),
            }}
        />
    );
export const getAccountCategoryIcon = (type: typeof AccountTypes[number], className: string) => (
    <Avatar className={className} style={{ backgroundColor: type.colour }}>
        <type.icon style={{ height: "60%" }} />
    </Avatar>
);
export const getCurrencyIcon = (currency: Currency, className: string) => (
    <Avatar className={className} style={{ backgroundColor: currency.colour }}>
        <Typography variant="button">{last(currency.symbol)}</Typography>
    </Avatar>
);
