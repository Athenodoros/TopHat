import { AccountBalance, Home, TrendingUp } from "@material-ui/icons";
import { zipObject } from "../../utilities/data";
import { BalanceHistory, ColourScale, ID, SDate, TransactionHistory } from "../utilities/values";

/**
 * A bank account or asset, possibly held at a financial institution
 */
export const AccountTypes = [
    { id: 1, name: "Transaction Account", icon: AccountBalance, colour: ColourScale(0).hex() },
    { id: 2, name: "Asset", icon: Home, colour: ColourScale(0.15).hex() },
    { id: 3, name: "Investment Account", icon: TrendingUp, colour: ColourScale(0.6).hex() },
] as const;
export const AccountTypeMap = zipObject(
    AccountTypes.map(({ id }) => id),
    AccountTypes
);
export type Account = {
    id: ID;
    index: number;
    name: string;
    website?: string;
    // colour: string;

    isActive: boolean;
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
    usesStatements: boolean;
};

/**
 * A category of transaction, possibly with a budget
 */
export interface Category {
    id: ID;
    index: number;
    name: string;
    colour: string;

    budget?: number;

    // TODO: This should be by currency
    transactions: TransactionHistory;
}

/**
 * A unit of financial asset - a currency (fiat or crypto), or share/bond
 */
export interface Currency {
    id: ID;
    index: number;
    name: string;
    longName: string;
    symbol: string;
    colour: string;

    exchangeRate: number;

    transactions: TransactionHistory;
}

/**
 * A financial institution, under which Accounts could be grouped
 */
export interface Institution {
    id: ID;
    index: number;
    name: string;
    colour: string;
    icon?: string;
}

/**
 * Rules for Transaction parsing
 */
export interface ReferenceCondition {
    type: "reference";
    values: string[];
    regex: boolean;
}
export interface ValueCondition {
    type: "value";
    max: number | undefined;
    min: number | undefined;
    currency: number;
}
export interface AccountCondition {
    type: "account";
    accounts: ID[];
}
export type Condition = ReferenceCondition | ValueCondition | AccountCondition;

export interface Rule {
    id: ID;
    name: string;
    index: number;
    isActive: boolean;
    conditions: Condition[];
    newSummary?: string;
    newDescription?: string;
    newCategory?: ID;
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
    transfer: boolean;

    value: number | null;
    recordedBalance: number | null;
    balance: number | null;

    account: ID;
    category: ID;
    currency: ID;
    statement: boolean;
}

/**
 * User-specific data persisted between sessions
 */
export interface UserState {
    currency: ID;
    isDemo: boolean;
}

export interface NotificationRuleDefinitions {
    "new-milestone": number;
    "uncategorised-transactions": number;
    "statement-ready": ID;
}
export interface Notification<K extends keyof NotificationRuleDefinitions = keyof NotificationRuleDefinitions> {
    id: ID;
    type: K;
    contents: NotificationRuleDefinitions[K];
}

/**
 * Meta-types for general use
 */
export interface BasicObjectType {
    account: Account;
    category: Category;
    currency: Currency;
    institution: Institution;
}
export type BasicObjectName = keyof BasicObjectType;
