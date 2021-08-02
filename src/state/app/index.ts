import { AnyAction, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { get, trimEnd, trimStart } from "lodash";
import { Account, Category, Currency, Institution, Rule } from "../data";
import { DeleteTransactionSelectionState, SaveTransactionSelectionState } from "../utilities/actions";
import { AccountPageState, AccountsPageState, PageStateType, TransactionsPageState } from "./types";

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
    },
    transactions: {
        id: "transactions" as const,
        transfers: false,
        chartSign: "debits" as const,
        chartAggregation: "category" as const,
        account: [],
        category: [],
        currency: [],
        statement: [],
        hideStubs: false,
        tableLimit: 50,
        search: "",
        searchRegex: false,
        selection: [],
    },
    categories: { id: "categories" as const },
    analysis: { id: "analysis" as const },
    forecasts: { id: "forecasts" as const },
};

const defaultValues = {
    account: undefined as Account | undefined,
    institution: undefined as Institution | undefined,
    category: undefined as Category | undefined,
    currency: undefined as Currency | undefined,
    statement: undefined,
    rule: undefined as Rule | undefined,
    settings: undefined as "import" | "export" | "storage" | "budgeting" | undefined,
};
const DefaultDialogs = { id: "closed" as "closed" | keyof typeof defaultValues, ...defaultValues };
export type DialogState = typeof DefaultDialogs;

interface AppState {
    dialog: DialogState;
    page: PageStateType;
}

const ObjectIDRegex = /^\d+$/;
export const getPagePathForPageState = (state: PageStateType) => {
    return "/" + state.id + (state.id === "account" ? "/" + state.account : "");
};
export const getPageStateFromPagePath = (path: string) => {
    const [_, page, id] = trimEnd(path, "#").split("/");

    if (page === "account")
        return ObjectIDRegex.test(id) ? ({ id: page, account: Number(id) } as AccountPageState) : null;

    return get(DefaultPages, trimStart(path, "/"), null) as PageStateType | null;
};

export const AppSlice = createSlice({
    name: "app",
    initialState: {
        dialog: DefaultDialogs,
        page: getPageStateFromPagePath(window.location.pathname) || DefaultPages["summary"],
    } as AppState,
    reducers: {
        setPage: (state, { payload }: PayloadAction<PageStateType["id"]>) => {
            state.page = DefaultPages[payload];
        },
        setPageState: (state, { payload: page }: PayloadAction<PageStateType>) => {
            state.page = page;
        },
        setPageStateFromPath: (state) => {
            state.page = getPageStateFromPagePath(window.location.pathname) || DefaultPages["summary"];
        },
        setAccountsPagePartial: (state, { payload }: PayloadAction<Partial<AccountsPageState>>) => {
            state.page = {
                ...(state.page.id === "accounts" ? state.page : DefaultPages["accounts"]),
                ...payload,
            };
        },
        setTransactionsPagePartial: (state, { payload }: PayloadAction<Partial<TransactionsPageState>>) => {
            state.page = {
                ...(state.page.id === "transactions" ? state.page : DefaultPages["transactions"]),
                ...payload,
            };
        },

        setDialogPage: (state, { payload }: PayloadAction<DialogState["id"]>) => {
            if (state.dialog.id !== "closed") state.dialog[state.dialog.id] = undefined;
            state.dialog.id = payload;
        },
        setDialogPartial: (state, { payload }: PayloadAction<Partial<DialogState>>) =>
            void Object.assign(state.dialog, payload),
    },
    extraReducers: (builder) => {
        builder
            .addCase(SaveTransactionSelectionState, (state) => {
                (state.page as TransactionsPageState).edit = undefined;
            })
            .addCase(DeleteTransactionSelectionState, (state) => {
                (state.page as TransactionsPageState).selection = [];
                (state.page as TransactionsPageState).edit = undefined;
            });
    },
});
const oldReducer = AppSlice.reducer; // Separate assignment to prevent infinite recursion
AppSlice.reducer = (state: AppState | undefined, action: AnyAction) => {
    const newState = oldReducer(state, action);

    if (state && window.location.pathname !== getPagePathForPageState(newState.page)) {
        window.history.pushState(null, "", getPagePathForPageState(newState.page));
    }

    return newState;
};
