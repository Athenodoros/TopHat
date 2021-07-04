import { createSlice, PayloadAction } from "@reduxjs/toolkit";
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
