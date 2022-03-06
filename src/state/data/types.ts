import { AccountBalance, Home, TrendingUp } from "@mui/icons-material";
import { EntityState } from "@reduxjs/toolkit";
import { zipObject } from "../../shared/data";
import { DialogColumnParseResult, DialogColumnValueMapping, DialogParseSpecification } from "../logic/statement";
import {
    BalanceHistory,
    ColourScale,
    ID,
    SDate,
    STime,
    TransactionHistory,
    TransactionHistoryWithLocalisation,
} from "../shared/values";

/**
 * A bank account or asset, possibly held at a financial institution
 */
export const AccountTypes = [
    { id: 1, name: "Transaction Account", icon: AccountBalance, colour: ColourScale(0).hex(), short: "Transaction" },
    { id: 2, name: "Asset", icon: Home, colour: ColourScale(0.15).hex(), short: "Asset" },
    { id: 3, name: "Investment Account", icon: TrendingUp, colour: ColourScale(0.6).hex(), short: "Investment" },
] as const;
export const AccountTypeMap = zipObject(
    AccountTypes.map(({ id }) => id),
    AccountTypes
);
export interface Account {
    id: ID;
    name: string;
    website?: string;
    // colour: string;

    isInactive: boolean;
    category: 1 | 2 | 3;
    institution: ID;

    openDate: SDate;
    firstTransactionDate?: SDate;
    lastTransactionDate?: SDate;
    lastUpdate: SDate;

    balances: {
        [currency: number]: BalanceHistory; // Monthly balances, in reverse order from current date
    };
    transactions: TransactionHistory;

    statementFilePattern?: string;
    statementFilePatternManual?: string;
    lastStatementFormat?: {
        parse: DialogParseSpecification;
        columns: DialogColumnParseResult["common"];
        mapping: DialogColumnValueMapping;
        date: SDate;
        reverse: boolean;
    };
}

/**
 * A category of transaction, possibly with a budget
 */
export interface Category {
    id: ID;
    name: string;
    colour: string;

    firstTransactionDate?: SDate;
    lastTransactionDate?: SDate;

    // This contains a list of parent hierarchies, not including the current ID
    // A `parent?: ID` field would be easier to update, but much slower and harder to use
    // The order is from sub-categories out to final parent categories - the last entry would have no parent
    hierarchy: ID[];

    transactions: TransactionHistory;
    budgets?: {
        start: SDate;
        strategy: "rollover" | "base" | "copy";
        base: number;

        // Going back in time, monthly - always at least 24 months
        // Sign convention: Expense categories have negative budgets
        values: number[];
    };
}

export interface CurrencyExchangeRate {
    month: SDate;
    value: number; // Relative to USD
}

/**
 * A unit of financial asset - a currency (fiat or crypto), or share/bond
 */
export interface CurrencySyncType {
    type: "currency" | "crypto" | "stock";
    ticker: string;
}
export interface Currency {
    id: ID;
    ticker: string;
    name: string;
    symbol: string;
    colour: string;

    start: SDate; // Month of first transaction
    rates: CurrencyExchangeRate[]; // Sorted, most recent first
    sync?: CurrencySyncType;

    transactions: TransactionHistoryWithLocalisation;
}

/**
 * A financial institution, under which Accounts could be grouped
 */
export interface Institution {
    id: ID;
    name: string;
    colour: string;
    icon?: string;
}

/**
 * Rules for Transaction parsing
 */
export interface Rule {
    id: ID;
    name: string;
    index: number;
    isInactive: boolean;

    // Conditions
    reference: string[];
    regex: boolean;

    min: number | null;
    max: number | null;

    accounts: ID[];

    // Outputs
    summary?: string;
    description?: string;
    category: ID;
}

/**
 * An increase, decrease, or balance reading for the value of an Account (in terms of a Currency)
 */
export interface Transaction {
    id: ID;

    date: SDate;
    reference: string;
    summary: string | null;
    description: string | null;

    value: number | null;
    recordedBalance: number | null;
    balance: number | null;

    account: ID;
    category: ID;
    currency: ID;
    statement: ID;
}

/**
 * An imported statement of transactions
 */
export interface Statement {
    id: ID;
    name: string;
    account: ID;
    date: SDate;
    contents: string;
}

/**
 * User-specific data persisted between sessions
 */
export const StubUserID = 0;
export interface DropboxSpec {
    refreshToken: string;
    name: string;
    email: string;
}
export interface User {
    // Just for dexie compatibility, this is actually a singleton - always equal to DBUserID;
    id: ID;

    // Internal state for potential migrations
    generation?: number;

    // Instance metadata
    isDemo: boolean;
    start: SDate;
    tutorial: boolean;

    // Display
    currency: ID;

    // External Services
    alphavantage: string;
    lastSyncTime?: STime;
    dropbox?: DropboxSpec | "loading";

    // Notification State
    disabled: string[]; // Disabled alert IDs
    milestone: number; // Milestone of last notification
    // milestoneInSight: number; // Milestone of last notification
    debt: number; // Debt Milestone of last notification
    accountOutOfDate: ID[]; // Accounts already flagged
    uncategorisedTransactionsAlerted: boolean; // Whether notification has been generated since backlog last cleared
}

export interface Notification {
    id: string;
    contents: string;
}

/**
 * Meta-types for general use
 */
export interface BasicObjectType {
    account: Account;
    category: Category;
    currency: Currency;
    institution: Institution;
    rule: Rule;
    statement: Statement;
}
export type BasicObjectName = keyof BasicObjectType;

export interface DataState {
    account: EntityState<Account>;
    category: EntityState<Category>;
    currency: EntityState<Currency>;
    institution: EntityState<Institution>;
    rule: EntityState<Rule>;
    transaction: EntityState<Transaction>;
    statement: EntityState<Statement>;
    user: EntityState<User>;
    notification: EntityState<Notification>;
}

export const DataKeys: (keyof DataState)[] = [
    "account",
    "category",
    "currency",
    "institution",
    "rule",
    "transaction",
    "statement",
    "user",
    "notification",
];
