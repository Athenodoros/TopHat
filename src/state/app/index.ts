import { AnyAction, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { get, trimEnd } from "lodash";
import type { DataState } from "../data/types";
import { StorageState } from "../logic/storage/types";
import { ID } from "../shared/values";
import { DefaultDialogs, DefaultPages, DialogState } from "./defaults";
import {
    AccountPageState,
    AccountsPageState,
    CategoriesPageState,
    CategoryPageState,
    PageStateType,
    TransactionsPageState,
} from "./pageTypes";
export { DefaultPages } from "./defaults";
export type { DialogState } from "./defaults";

// Progress of a TopHat export or backup dropped onto (or chosen from) the tutorial, which the tutorial imports once
// the user confirms it
export type JSONImportStatus =
    | { type: "idle" }
    | { type: "loading" }
    | { type: "loaded"; name: string; data: DataState }
    | { type: "error"; message: string };

interface AppState {
    dialog: DialogState;
    page: PageStateType;
    // How the attempt to load saved data went, and left alone by everything else in here
    storage: StorageState;
    jsonImport: JSONImportStatus;
}

export const BASE_PATHNAME = "/TopHat";

const ObjectIDRegex = /^\d+$/;
export const getPagePathForPageState = (state: PageStateType) => {
    let path = BASE_PATHNAME + "/" + state.id;
    if (state.id === "account") path += "/" + state.account;
    if (state.id === "category") path += "/" + state.category;
    return path;
};
const getDefaultPageState = (page: PageStateType | null) => ({
    dialog: DefaultDialogs,
    page: page || DefaultPages["summary"],
});

export const getAppStateFromPagePath = (location: Location): Omit<AppState, "storage" | "jsonImport"> => {
    const [_, page, id] = trimEnd(location.pathname, "#").substring(BASE_PATHNAME.length).split("/");

    if (page === "dropbox")
        return {
            dialog: { ...DefaultDialogs, id: "settings", settings: "storage" },
            page: DefaultPages["summary"],
        };
    if (page === "account")
        return getDefaultPageState(ObjectIDRegex.test(id) ? { ...DefaultPages.account, account: Number(id) } : null);
    if (page === "category")
        return getDefaultPageState(ObjectIDRegex.test(id) ? { ...DefaultPages.category, category: Number(id) } : null);

    return getDefaultPageState(get(DefaultPages, page, DefaultPages.summary));
};

const initialState: AppState = {
    ...getAppStateFromPagePath(window.location),
    storage: { type: "loading" },
    jsonImport: { type: "idle" },
};

export const AppSlice = createSlice({
    name: "app",
    initialState,
    reducers: {
        setPage: (state, { payload }: PayloadAction<PageStateType["id"]>) => {
            state.page = DefaultPages[payload];
        },
        setPageState: (state, { payload: page }: PayloadAction<PageStateType>) => {
            state.page = page;
        },
        setPageStateFromPath: (state) => ({
            ...getAppStateFromPagePath(window.location),
            storage: state.storage,
            jsonImport: state.jsonImport,
        }),
        setAccountsPagePartial: (state, { payload }: PayloadAction<Partial<AccountsPageState>>) => {
            state.page = {
                ...(state.page.id === "accounts" ? state.page : DefaultPages["accounts"]),
                ...payload,
            };
        },
        setAccountTableStatePartial: (state, { payload }: PayloadAction<Partial<AccountPageState["table"]>>) => {
            if (state.page.id !== "account") state.page = DefaultPages["account"];
            state.page.table = {
                ...state.page.table,
                ...payload,
            };
        },
        setAccountTableStatement: (state, { payload }: PayloadAction<ID>) => {
            if (state.page.id !== "account") state.page = DefaultPages["account"];
            state.page.table.filters.statement = [payload];
        },
        setAccountPagePartial: (state, { payload }: PayloadAction<Partial<AccountPageState>>) => {
            state.page = {
                ...(state.page.id === "account" ? state.page : DefaultPages["account"]),
                ...payload,
            };
        },
        setTransactionsPagePartial: (state, { payload }: PayloadAction<Partial<TransactionsPageState>>) => {
            state.page = {
                ...(state.page.id === "transactions" ? state.page : DefaultPages["transactions"]),
                ...payload,
            };
        },
        setTransactionsTablePartial: (state, { payload }: PayloadAction<Partial<TransactionsPageState["table"]>>) => {
            if (state.page.id !== "transactions") state.page = DefaultPages["transactions"];
            state.page.table = {
                ...state.page.table,
                ...payload,
            };
        },
        setCategoriesPagePartial: (state, { payload }: PayloadAction<Partial<CategoriesPageState>>) => {
            state.page = {
                ...(state.page.id === "categories" ? state.page : DefaultPages["categories"]),
                ...payload,
            };
        },
        setCategoryTableStatePartial: (state, { payload }: PayloadAction<Partial<CategoryPageState["table"]>>) => {
            if (state.page.id !== "category") state.page = DefaultPages["category"];
            state.page.table = {
                ...state.page.table,
                ...payload,
            };
        },

        setDialogPage: (state, { payload }: PayloadAction<DialogState["id"]>) => {
            if (state.dialog.id === payload) return;

            if (state.dialog.id !== "closed") state.dialog[state.dialog.id] = DefaultDialogs[state.dialog.id] as any;
            state.dialog.id = payload;
        },
        setDialogPartial: (state, { payload }: PayloadAction<Partial<DialogState>>) => {
            state.dialog = { ...state.dialog, ...payload };
        },
        closeDialogAndGoToPage: (state, { payload: page }: PayloadAction<PageStateType>) => ({
            dialog: DefaultDialogs,
            page,
            storage: state.storage,
            jsonImport: state.jsonImport,
        }),
        setStorageState: (state, { payload }: PayloadAction<StorageState>) => {
            state.storage = payload;
        },
        setJSONImportStatus: (state, { payload }: PayloadAction<JSONImportStatus>) => {
            state.jsonImport = payload;
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
