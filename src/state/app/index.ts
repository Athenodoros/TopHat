import { AnyAction, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { get, trimStart } from "lodash";
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
    data: { id: "data" as const },
    settings: { id: "settings" as const },
};

interface AppState {
    page: PageStateType;
}

const ObjectIDRegex = /^\d+$/;
export const getPagePathForPageState = (state: PageStateType) => {
    return "/" + state.id + (state.id === "account" ? "/" + state.account : "");
};
export const getPageStateFromPagePath = (path: string) => {
    const [_, page, id] = path.split("/");

    if (page === "account")
        return ObjectIDRegex.test(id) ? ({ id: page, account: Number(id) } as AccountPageState) : null;

    return get(DefaultPages, trimStart(path, "/"), null) as PageStateType | null;
};

export const AppSlice = createSlice({
    name: "app",
    initialState: {
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
