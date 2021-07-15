import { AnyAction, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { get, trimStart } from "lodash";
import { AccountsPageState, PageStateType, TransactionsPageState } from "./types";

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
    transactions: {
        id: "transactions" as const,
        chartSign: "debits" as const,
        chartAggregation: "category" as const,
        account: [],
        category: [],
        currency: [],
        statement: "all" as const,
        transfers: "all" as const,
        showStubs: false,
        tableLimit: 50,
        search: "",
        searchRegex: false,
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

export const getPagePathForPageState = ({ id }: PageStateType) => "/" + id;
export const getPageStateFromPagePath = (path: string) =>
    get(DefaultPages, trimStart(path, "/"), null) as PageStateType | null;

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
});
const oldReducer = AppSlice.reducer; // Separate assignment to prevent infinite recursion
AppSlice.reducer = (state: AppState | undefined, action: AnyAction) => {
    const newState = oldReducer(state, action);

    if (state && window.location.pathname !== getPagePathForPageState(newState.page)) {
        window.history.pushState(null, "", getPagePathForPageState(newState.page));
    }

    return newState;
};
