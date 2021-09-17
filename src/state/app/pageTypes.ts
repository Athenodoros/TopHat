import { Transaction } from "../data";
import { ID, SDate } from "../utilities/values";

export type ChartSign = "all" | "credits" | "debits";
export const ChartSigns = ["all", "credits", "debits"] as ChartSign[];
export type BooleanFilter = "all" | "include" | "exclude";
export const BooleanFilters = ["all", "include", "exclude"] as BooleanFilter[];

export type EditTransactionState = { [K in keyof Transaction]?: Transaction[K] };
export interface TransactionsTableFilterState {
    fromDate?: SDate;
    toDate?: SDate;
    valueFrom?: number;
    valueTo?: number;
    account: ID[];
    category: ID[];
    currency: ID[];
    statement: ID[];
    hideStubs: boolean;
    search: string;
    searchRegex: boolean;
    tableLimit: number;
}
export interface TransactionsTableEditState {
    selection: ID[];
    edit?: EditTransactionState; // if "id" is undefined, then it's the header
}
export interface TransactionsTableState extends TransactionsTableFilterState, TransactionsTableEditState {}
export const TransactionsTableStateFilterFields: readonly (keyof TransactionsTableFilterState)[] = [
    "fromDate",
    "toDate",
    "valueTo",
    "valueFrom",
    "account",
    "category",
    "currency",
    "statement",
    "hideStubs",
    "search",
    "searchRegex",
    "tableLimit",
] as const;
export const TransactionsTableStateEditFields: readonly (keyof TransactionsTableEditState)[] = ["selection", "edit"];
export const DefaultTransactionsTableState: TransactionsTableState = {
    account: [],
    category: [],
    currency: [],
    statement: [],
    hideStubs: false,
    tableLimit: 50,
    search: "",
    searchRegex: false,
    selection: [],
};

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
export interface AccountPageState extends Omit<TransactionsTableState, "account"> {
    id: "account";
    account: ID;
}

export const TransactionsPageAggregations = ["category", "currency", "account"] as const;
export interface TransactionsPageState extends TransactionsTableState {
    // Page ID
    id: "transactions";

    // Summary
    chartSign: ChartSign;
    chartAggregation: typeof TransactionsPageAggregations[number];
}
export interface CategoriesPageState {
    id: "categories";
    metric: "previous" | "average";
    tableSign: ChartSign;
}
export interface AnalysisPageState {
    id: "analysis";
}
export interface ForecastsPageState {
    id: "forecasts";
}

export type PageStateType =
    | SummaryPageState
    | AccountsPageState
    | AccountPageState
    | TransactionsPageState
    | CategoriesPageState
    | AnalysisPageState
    | ForecastsPageState;
