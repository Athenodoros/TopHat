import { AnyAction, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { get, trimEnd, trimStart } from "lodash";
import { DeleteTransactionSelectionState, SaveTransactionTableSelectionState } from "../utilities/actions";
import { DefaultDialogs, DefaultPages, DialogState } from "./defaults";
import {
    AccountPageState,
    AccountsPageState,
    CategoriesPageState,
    PageStateType,
    TransactionsPageState,
    TransactionsTableEditState,
} from "./pageTypes";
export { DefaultPages } from "./defaults";
export type { DialogState } from "./defaults";

interface AppState {
    dialog: DialogState;
    page: PageStateType;
}

const ObjectIDRegex = /^\d+$/;
export const getPagePathForPageState = (state: PageStateType) => {
    let path = "/" + state.id;
    if (state.id === "account") path += "/" + state.account;
    if (state.id === "category") path += "/" + state.category;
    return path;
};
export const getPageStateFromPagePath = (path: string) => {
    const [_, page, id] = trimEnd(path, "#").split("/");

    if (page === "account") return ObjectIDRegex.test(id) ? { ...DefaultPages.account, account: Number(id) } : null;
    if (page === "category") return ObjectIDRegex.test(id) ? { ...DefaultPages.category, category: Number(id) } : null;

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
        setTransactionTableStatePartial: (state, { payload }: PayloadAction<Partial<TransactionsTableEditState>>) => {
            if (state.page.id !== "transactions") return;
            state.page = {
                ...state.page,
                ...payload,
            };
        },
        setCategoriesPagePartial: (state, { payload }: PayloadAction<Partial<CategoriesPageState>>) => {
            state.page = {
                ...(state.page.id === "categories" ? state.page : DefaultPages["categories"]),
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
    extraReducers: (builder) => {
        builder
            .addCase(SaveTransactionTableSelectionState, (state) => {
                (state.page as TransactionsTableEditState).edit = undefined;
            })
            .addCase(DeleteTransactionSelectionState, (state) => {
                (state.page as TransactionsTableEditState).selection = [];
                (state.page as TransactionsTableEditState).edit = undefined;
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
