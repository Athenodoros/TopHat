import { AnyAction, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { get, trimEnd, trimStart } from "lodash";
import { DeleteTransactionSelectionState, SaveTransactionSelectionState } from "../utilities/actions";
import { DefaultDialogs, DefaultPages, DialogState } from "./defaults";
import { AccountPageState, AccountsPageState, PageStateType, TransactionsPageState } from "./pageTypes";
export { DefaultPages } from "./defaults";
export type { DialogState } from "./defaults";

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
