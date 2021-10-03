import { TransactionsTableFilters, TransactionsTableState } from "../../components/table/table/types";
import { ID } from "../shared/values";

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
    table: {
        filters: Omit<TransactionsTableFilters, "account">;
        state: TransactionsTableState;
    };
}

export const TransactionsPageAggregations = ["category", "currency", "account"] as const;
export interface TransactionsPageState {
    // Page ID
    id: "transactions";

    // Summary
    chartSign: ChartSign;
    chartAggregation: typeof TransactionsPageAggregations[number];

    // Table
    table: {
        filters: TransactionsTableFilters;
        state: TransactionsTableState;
    };
}
export interface CategoriesPageState {
    id: "categories";
    summaryMetric: "current" | "previous" | "average";
    tableMetric: "current" | "previous" | "average";
    hideEmpty: "none" | "subcategories" | "all";
    summarySign: ChartSign;
    tableSign: ChartSign;
}
export interface CategoryPageState {
    id: "category";
    category: ID;
    table: {
        nested: boolean;
        filters: TransactionsTableFilters;
        state: TransactionsTableState;
    };
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
    | CategoryPageState
    | ForecastsPageState;
