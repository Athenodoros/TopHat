import { AnyAction, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { get, trimStart } from "lodash";
import { PageStateType } from "./types";

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
    },
    transactions: {
        id: "transactions" as const,
        chartSign: "debits" as const,
        chartAggregation: "category" as const,
        account: [],
        category: [],
        currency: [],
        statement: [],
        transfers: "all" as const,
        showStubs: false,
        tableLimit: 100,
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

export const AppSlice = createSlice({
    name: "app",
    initialState: {
        page: DefaultPages.summary,
    } as AppState,
    reducers: {
        setPage: (state, { payload }: PayloadAction<PageStateType["id"]>) => ({
            ...state,
            page: DefaultPages[payload],
        }),
        setPageState: (state, { payload }: PayloadAction<PageStateType>) => ({ ...state, page: payload }),
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

export const getPagePathForPageState = ({ id }: PageStateType) => "/" + id;
export const getPageStateFromPagePath = (path: string) =>
    get(DefaultPages, trimStart(path, "/"), null) as PageStateType | null;
