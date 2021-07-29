import { EntityId } from "@reduxjs/toolkit";
import { max } from "lodash";
import { Greys } from "../../styles/colours";
import { BaseTransactionHistory, StatementParseOptions } from "../utilities/values";
import { Category, Currency, Institution, Statement, Transaction } from "./types";

export const PLACEHOLDER_CATEGORY_ID = 0;
export const PLACEHOLDER_CATEGORY: Category = {
    id: PLACEHOLDER_CATEGORY_ID,
    name: "No Category",
    colour: Greys[500],
    transactions: BaseTransactionHistory(),
};
export const TRANSFER_CATEGORY_ID = -1;
export const TRANSFER_CATEGORY: Category = {
    id: TRANSFER_CATEGORY_ID,
    name: "Transfer",
    colour: Greys[500],
    transactions: BaseTransactionHistory(),
};

export const PLACEHOLDER_INSTITUTION_ID = 0;
export const PLACEHOLDER_INSTITUTION: Institution = {
    id: PLACEHOLDER_INSTITUTION_ID,
    name: "No Institution",
    colour: Greys[600],
};

export const PLACEHOLDER_STATEMENT_ID = 0;
export const PLACEHOLDER_STATEMENT: Statement = {
    id: PLACEHOLDER_STATEMENT_ID,
    name: "No Statement",
    contents: "",
    date: "",
    parsing: null as unknown as StatementParseOptions,
    account: -1,
};

export const changeCurrencyValue = (to: Currency, from: Currency, value: number) =>
    (value * from.exchangeRate) / to.exchangeRate;

export const compareTransactionsDescendingDates = (a: Transaction, b: Transaction) => -a.date.localeCompare(b.date);

export const getNextID = (ids: EntityId[]) => {
    const maximum = max(ids.map((i) => Number(i)));
    return (maximum ?? 0) + 1;
};
