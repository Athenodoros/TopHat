import { createEntityAdapter, createSlice, EntityState, PayloadAction, Update } from "@reduxjs/toolkit";
import { ID } from "../utilities/values";
import { DemoObjects } from "./demo";
import { Account, Category, Currency, Institution, Rule, Transaction } from "./types";
export type { Account, Category, Currency, Institution, Rule, Transaction } from "./types";

const BaseAdapter = createEntityAdapter();
const IndexedAdapter = createEntityAdapter<{ index: number }>({ sortComparer: (a, b) => a.index - b.index });

interface UserState {
    currency: number;
}
interface DataState {
    account: EntityState<Account>;
    category: EntityState<Category>;
    currency: EntityState<Currency>;
    institution: EntityState<Institution>;
    rule: EntityState<Rule>;
    transaction: EntityState<Transaction>;
    user: UserState;
}

const defaults = {
    account: BaseAdapter.getInitialState(),
    category: BaseAdapter.getInitialState(),
    currency: BaseAdapter.getInitialState(),
    institution: BaseAdapter.getInitialState(),
    rule: BaseAdapter.getInitialState(),
    transaction: BaseAdapter.getInitialState(),
    user: { currency: 1 },
} as DataState;

export const DataSlice = createSlice({
    name: "data",
    initialState: defaults,
    reducers: {
        reset: () => defaults,
        set: (_, action: PayloadAction<DataState>) => action.payload,
        setUpDemo: () => ({
            account: IndexedAdapter.addMany(defaults.account, DemoObjects.accounts),
            category: IndexedAdapter.addMany(defaults.category, DemoObjects.categories),
            currency: IndexedAdapter.addMany(defaults.currency, DemoObjects.currencies),
            institution: IndexedAdapter.addMany(defaults.institution, DemoObjects.institutions),
            rule: IndexedAdapter.addMany(defaults.rule, DemoObjects.rules),
            transaction: BaseAdapter.addMany(defaults.transaction, DemoObjects.transactions),
            user: defaults.user,
        }),

        // Accounts
        CreateAccount: (state, action: PayloadAction<Account>) => ({
            ...state,
            account: IndexedAdapter.addOne(state.account, action),
        }),
        DeleteAccount: (state, action: PayloadAction<ID>) => ({
            ...state,
            account: IndexedAdapter.removeOne(state.account, action),
        }),
        UpdateAccount: (state, action: PayloadAction<Update<Account>>) => ({
            ...state,
            account: IndexedAdapter.updateOne(state.account, action),
        }),

        // Categories
        CreateCategory: (state, action: PayloadAction<Category>) => ({
            ...state,
            category: IndexedAdapter.addOne(state.category, action),
        }),
        DeleteCategory: (state, action: PayloadAction<ID>) => ({
            ...state,
            category: IndexedAdapter.removeOne(state.category, action),
        }),
        UpdateCategory: (state, action: PayloadAction<Update<Category>>) => ({
            ...state,
            category: IndexedAdapter.updateOne(state.category, action),
        }),

        // Currencies
        CreateCurrency: (state, action: PayloadAction<Currency>) => ({
            ...state,
            currency: IndexedAdapter.addOne(state.currency, action),
        }),
        DeleteCurrency: (state, action: PayloadAction<ID>) => ({
            ...state,
            currency: IndexedAdapter.removeOne(state.currency, action),
        }),
        UpdateCurrency: (state, action: PayloadAction<Update<Currency>>) => ({
            ...state,
            currency: IndexedAdapter.updateOne(state.currency, action),
        }),

        // Institution
        CreateInstitution: (state, action: PayloadAction<Institution>) => ({
            ...state,
            institution: IndexedAdapter.addOne(state.institution, action),
        }),
        DeleteInstitution: (state, action: PayloadAction<ID>) => ({
            ...state,
            institution: IndexedAdapter.removeOne(state.institution, action),
        }),
        UpdateInstitution: (state, action: PayloadAction<Update<Institution>>) => ({
            ...state,
            institution: IndexedAdapter.updateOne(state.institution, action),
        }),

        // Rules
        CreateRule: (state, action: PayloadAction<Rule>) => ({
            ...state,
            rule: IndexedAdapter.addOne(state.rule, action),
        }),
        DeleteRule: (state, action: PayloadAction<ID>) => ({
            ...state,
            rule: IndexedAdapter.removeOne(state.rule, action),
        }),
        UpdateRule: (state, action: PayloadAction<Update<Rule>>) => ({
            ...state,
            rule: IndexedAdapter.updateOne(state.rule, action),
        }),

        // Transactions
        CreateTransaction: (state, action: PayloadAction<Transaction>) => ({
            ...state,
            transaction: BaseAdapter.addOne(state.transaction, action),
        }),
        DeleteTransaction: (state, action: PayloadAction<ID>) => ({
            ...state,
            transaction: BaseAdapter.removeOne(state.transaction, action),
        }),
        UpdateTransaction: (state, action: PayloadAction<Update<Transaction>>) => ({
            ...state,
            transaction: BaseAdapter.updateOne(state.transaction, action),
        }),

        // User
        UpdateUserCurrency: (state, action: PayloadAction<number>) => ({
            ...state,
            user: {
                currency: action.payload,
            },
        }),
    },
});
