import { AccountBalance, Home, TrendingUp } from "@material-ui/icons";
import { zipObject } from "../../utilities/data";
import { DialogColumnParseResult, DialogColumnValueMapping, DialogParseSpecification } from "../logic/statement";
import { BalanceHistory, ColourScale, ID, SDate, TransactionHistory } from "../utilities/values";

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
    };
}

/**
 * A category of transaction, possibly with a budget
 */
export interface Category {
    id: ID;
    name: string;
    colour: string;

    // budget?: number;

    // TODO: This should be by currency
    transactions: TransactionHistory;
}

/**
 * A unit of financial asset - a currency (fiat or crypto), or share/bond
 */
export interface Currency {
    id: ID;
    ticker: string;
    name: string;
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
    isInactive: boolean;

    // Conditions
    reference?: string[];
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
export interface UserState {
    currency: ID;
    isDemo: boolean;
    start: SDate;
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
    rule: Rule;
    statement: Statement;
}
export type BasicObjectName = keyof BasicObjectType;
