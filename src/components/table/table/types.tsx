import { Transaction } from "../../../state/data";
import { ID, SDate } from "../../../state/shared/values";

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

/**
 * This holds the edit state for the table, with three state possibilities:
 *     A new transaction is being created: "edit" is a valid Transaction, but "edit.id" is not in the main store
 *     One transaction is being edited: "edit" is a valid Transaction, and "edit.id" is in the main store
 *     One or more transactions are being edited in the header:
 *         - "edit" is a Partial<Transaction>, where undefined corresponds to mixed values in the transactions
 *         - "edit.id" is undefined
 *         - "selection" contains the list of IDs being edited
 */
export type EditTransactionState = { [K in keyof Transaction]?: Transaction[K] };
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
          nested: boolean;
      };
