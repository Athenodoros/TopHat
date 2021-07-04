import { Transaction } from "../data/types";

export type Sign = "all" | "credits" | "debits";
export const Signs = ["all", "credits", "debits"] as Sign[];

export type SummaryPageState = {
    id: "summary";
};
export type AccountsPageState = {
    id: "accounts";
    chartSign: Sign;
    chartAggregation: "account" | "currency" | "institution" | "type";
    account: number[];
    institution: number[];
    type: number[];
    currency: number[];
    filterInactive: boolean;
};
export type TransactionsPageState = {
    id: "transactions";
    fromDate?: string;
    toDate?: string;
    valueFrom?: number;
    valueTo?: number;
    account: number[];
    category: number[];
    currency: number[];
    statement: (number | undefined)[];
    chartSign: Sign;
    chartAggregation: "category" | "currency" | "account";
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
