import { omit } from "lodash";
import { Account, Category, Currency, Institution, Rule, Statement } from "../data";
import { DefaultTransactionsTableState } from "./pageTypes";
import { DialogFileState } from "./statementTypes";

export const DefaultPages = {
    summary: { id: "summary" as const },
    accounts: {
        id: "accounts" as const,
        chartSign: "all" as const,
        chartAggregation: "type" as const,
        account: [],
        institution: [],
        currency: [],
        type: [],
        filterInactive: true,
        balances: "all" as const,
    },
    account: {
        id: "account" as const,
        account: 0,
        ...omit(DefaultTransactionsTableState, "account"),
    },
    transactions: {
        id: "transactions" as const,
        transfers: false,
        chartSign: "debits" as const,
        chartAggregation: "category" as const,
        ...DefaultTransactionsTableState,
    },
    categories: { id: "categories", metric: "previous", tableSign: "debits" } as const,
    analysis: { id: "analysis" as const },
    forecasts: { id: "forecasts" as const },
};

const defaultValues = {
    account: undefined as Account | undefined,
    institution: undefined as Institution | undefined,
    category: undefined as Category | undefined,
    currency: undefined as Currency | undefined,
    statement: undefined as Statement | undefined,
    import: { page: "file", rejections: [] } as DialogFileState,
    rule: undefined as Rule | undefined,
    settings: undefined as "import" | "export" | "storage" | "budgeting" | undefined,
};
export const DefaultDialogs = { id: "closed" as "closed" | keyof typeof defaultValues, ...defaultValues };
export type DialogState = typeof DefaultDialogs;
