import { Transaction } from "../data";
import { ID, SDate } from "../utilities/values";

export type ChartSign = "all" | "credits" | "debits";
export const ChartSigns = ["all", "credits", "debits"] as ChartSign[];
export type BooleanFilter = "all" | "include" | "exclude";
export const BooleanFilters = ["all", "include", "exclude"] as BooleanFilter[];

export interface SummaryPageState {
    id: "summary";
}
export const AccountsPageAggregations = ["account", "currency", "institution", "type"] as const;
export interface AccountsPageState {
    // Page ID
    id: "accounts";

    // Summary
    chartSign: ChartSign;
    chartAggregation: typeof AccountsPageAggregations[number];

    // Filters
    account: ID[];
    institution: ID[];
    type: ID[];
    currency: ID[];
    balances: ChartSign;
    filterInactive: boolean;
}
export interface AccountPageState {
    id: "account";
    account: ID;
}

export const TransactionsPageAggregations = ["category", "currency", "account"] as const;
export type EditTransactionState = { [K in keyof Transaction]?: Transaction[K] };
export interface TransactionsPageState {
    // Page ID
    id: "transactions";

    // Summary
    transfers: boolean;
    chartSign: ChartSign;
    chartAggregation: typeof TransactionsPageAggregations[number];

    // Filters
    fromDate?: SDate;
    toDate?: SDate;
    valueFrom?: number;
    valueTo?: number;
    account: ID[];
    category: ID[];
    currency: ID[];
    statement: BooleanFilter;
    hideStubs: boolean;
    search: string;
    searchRegex: boolean;
    tableLimit: number;

    // Table State
    selection: ID[];
    edit?: EditTransactionState; // if "id" is undefined, then it's the header
}
export interface CategoriesPageState {
    id: "categories";
}
export interface AnalysisPageState {
    id: "analysis";
}
export interface ForecastsPageState {
    id: "forecasts";
}
export interface DataPageState {
    id: "data";
}
export interface SettingsPageState {
    id: "settings";
}

export type PageStateType =
    | SummaryPageState
    | AccountsPageState
    | AccountPageState
    | TransactionsPageState
    | CategoriesPageState
    | AnalysisPageState
    | ForecastsPageState
    | DataPageState
    | SettingsPageState;
