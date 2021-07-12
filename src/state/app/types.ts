import { Transaction } from "../data/types";

export type ChartSign = "all" | "credits" | "debits";
export const ChartSigns = ["all", "credits", "debits"] as ChartSign[];

export type SummaryPageState = {
    id: "summary";
};
export const AccountsPageAggregations = ["account", "currency", "institution", "type"] as const;
export type AccountsPageState = {
    id: "accounts";
    chartSign: ChartSign;
    chartAggregation: typeof AccountsPageAggregations[number];
    account: number[];
    institution: number[];
    type: number[];
    currency: number[];
    filterInactive: boolean;
};
export const TransactionsPageAggregations = ["category", "currency", "account"] as const;
export type TransactionsPageState = {
    id: "transactions";
    fromDate?: string;
    toDate?: string;
    valueFrom?: number;
    valueTo?: number;
    account: number[];
    category: number[];
    currency: number[];
    statement: "all" | "include" | "exclude";
    chartSign: ChartSign;
    chartAggregation: typeof TransactionsPageAggregations[number];
    transfers: "all" | "include" | "exclude";
    showStubs: boolean;
    tableLimit: number;
    search: string;
    searchRegex: boolean;
    edit?: Partial<Transaction>;
};
export type CategoriesPageState = {
    id: "categories";
};
export type AnalysisPageState = {
    id: "analysis";
};
export type ForecastsPageState = {
    id: "forecasts";
};
export type DataPageState = {
    id: "data";
};
export type SettingsPageState = {
    id: "settings";
};

export type PageStateType =
    | SummaryPageState
    | AccountsPageState
    | TransactionsPageState
    | CategoriesPageState
    | AnalysisPageState
    | ForecastsPageState
    | DataPageState
    | SettingsPageState;
