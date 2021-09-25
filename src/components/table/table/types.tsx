import { EditTransactionState } from "../../../state/data/types";
import { ID, SDate } from "../../../state/utilities/values";

// Filters
export interface TransactionsTableFilters {
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
export const DefaultTransactionsTableFilters: TransactionsTableFilters = {
    account: [],
    category: [],
    currency: [],
    statement: [],
    hideStubs: false,
    search: "",
    searchRegex: false,
    tableLimit: 50,
};

// Internal State
export interface TransactionsTableState {
    selection: ID[];
    edit?: EditTransactionState; // if "id" is undefined, then it's the header
}
export const DefaultTransactionsTableState: TransactionsTableState = {
    selection: [],
};

// Fixed state state
export type TransactionsTableFixedDataState =
    | {
          type: "account";
          account: ID;
      }
    | {
          type: "category";
          category: ID;
      };
