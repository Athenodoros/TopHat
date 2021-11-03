import { AnyAction, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { get, range, trimEnd } from "lodash";
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

interface AppState {
    dialog: DialogState;
    page: PageStateType;
}

// This is a gross hack to get the public URL, because I can't get process.env.PUBLIC_URL to work properly
export let BASE_PATHNAME = "";
for (let i in range(document.head.childNodes.length)) {
    const node = document.head.childNodes[i] as HTMLLinkElement;
    if (node.href?.endsWith("favicon.png")) {
        BASE_PATHNAME = trimEnd(new URL(node.href).pathname, "/favicon.png");
        break;
    }
}

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

export const getAppStateFromPagePath = (location: Location): AppState => {
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

export const AppSlice = createSlice({
    name: "app",
    initialState: getAppStateFromPagePath(window.location),
    reducers: {
        setPage: (state, { payload }: PayloadAction<PageStateType["id"]>) => {
            state.page = DefaultPages[payload];
        },
        setPageState: (state, { payload: page }: PayloadAction<PageStateType>) => {
            state.page = page;
        },
        setPageStateFromPath: () => getAppStateFromPagePath(window.location),
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
        setDialogPartial: (state, { payload }: PayloadAction<Partial<DialogState>>) =>
            void Object.assign(state.dialog, payload),
        closeDialogAndGoToPage: (_, { payload: page }: PayloadAction<PageStateType>) => ({
            dialog: DefaultDialogs,
            page,
        }),
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
