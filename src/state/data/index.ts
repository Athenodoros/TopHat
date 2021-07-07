import { createEntityAdapter, createSlice, Dictionary, EntityId, EntityState, PayloadAction } from "@reduxjs/toolkit";
import { clone, cloneDeep, fromPairs, range, reverse, round, zipObject } from "lodash";
import {
    BalanceHistory,
    BaseBalanceValues,
    BaseTransactionHistory,
    ID,
    parseDate,
    SDate,
    TransactionHistory,
} from "../utilities/values";
import { DemoObjects } from "./demo";
import { Account, Category, Currency, Institution, Rule, Transaction } from "./types";
export type { Account, Category, Currency, Institution, Rule, Transaction } from "./types";

const IndexedAdapter = createEntityAdapter<{ index: number }>({ sortComparer: (a, b) => a.index - b.index });
const DateAdapter = createEntityAdapter<Transaction>({ sortComparer: (a, b) => -a.date.localeCompare(b.date) });

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
    account: IndexedAdapter.getInitialState(),
    category: IndexedAdapter.getInitialState(),
    currency: IndexedAdapter.getInitialState(),
    institution: IndexedAdapter.getInitialState(),
    rule: IndexedAdapter.getInitialState(),
    transaction: DateAdapter.getInitialState(),
    user: { currency: 1 },
} as DataState;

export const DataSlice = createSlice({
    name: "data",
    initialState: defaults,
    reducers: {
        reset: () => defaults,
        set: (_, action: PayloadAction<DataState>) => action.payload,
        setUpDemo: () => {
            let transactions = DateAdapter.addMany(defaults.transaction, DemoObjects.transactions);
            transactions = markAllBalances(transactions);

            const { accountLastTransactionDates, accountBalances, transactionSummaries } = getTransactionSummaries(
                transactions,
                defaults.user.currency,
                zipObject(
                    DemoObjects.currencies.map(({ id }) => id),
                    DemoObjects.currencies
                )
            );

            return {
                account: IndexedAdapter.addMany(
                    defaults.account,
                    DemoObjects.accounts.map((account) => ({
                        ...account,
                        lastTransactionDate: accountLastTransactionDates[account.id],
                        balances: accountBalances[account.id],
                        transactions: transactionSummaries.account[account.id],
                    }))
                ),
                category: IndexedAdapter.addMany(
                    defaults.category,
                    DemoObjects.categories.map((category) => ({
                        ...category,
                        transactions: transactionSummaries.category[category.id],
                    }))
                ),
                currency: IndexedAdapter.addMany(
                    defaults.currency,
                    DemoObjects.currencies.map((currency) => ({
                        ...currency,
                        transactions: transactionSummaries.currency[currency.id],
                    }))
                ),
                institution: IndexedAdapter.addMany(defaults.institution, DemoObjects.institutions),
                rule: IndexedAdapter.addMany(defaults.rule, DemoObjects.rules),
                transaction: transactions,
                user: defaults.user,
            };
        },

        // Accounts
        // CreateAccount: (state, action: PayloadAction<Account>) => ({
        //     ...state,
        //     account: IndexedAdapter.addOne(state.account, action),
        // }),
        // DeleteAccount: (state, { payload }: PayloadAction<ID>) => ({
        //     ...state,
        //     account: IndexedAdapter.removeOne(state.account, payload),
        //     transaction: BaseAdapter.removeMany(state.transaction,
        //         values(state.transaction.entities).filter(t => t?.account === payload).map(t => t!.id)
        //     ),
        // }),
        // UpdateAccount: (state, action: PayloadAction<Update<Account>>) => ({
        //     ...state,
        //     account: IndexedAdapter.updateOne(state.account, action),
        // }),

        // Categories
        // CreateCategory: (state, action: PayloadAction<Category>) => ({
        //     ...state,
        //     category: IndexedAdapter.addOne(state.category, action),
        // }),
        // DeleteCategory: (state, action: PayloadAction<ID>) => ({
        //     ...state,
        //     category: IndexedAdapter.removeOne(state.category, action),
        // }),
        // UpdateCategory: (state, action: PayloadAction<Update<Category>>) => ({
        //     ...state,
        //     category: IndexedAdapter.updateOne(state.category, action),
        // }),

        // Currencies
        // CreateCurrency: (state, action: PayloadAction<Currency>) => ({
        //     ...state,
        //     currency: IndexedAdapter.addOne(state.currency, action),
        // }),
        // DeleteCurrency: (state, action: PayloadAction<ID>) => ({
        //     ...state,
        //     currency: IndexedAdapter.removeOne(state.currency, action),
        // }),
        // UpdateCurrency: (state, action: PayloadAction<Update<Currency>>) => ({
        //     ...state,
        //     currency: IndexedAdapter.updateOne(state.currency, action),
        // }),

        // Institution
        // CreateInstitution: (state, action: PayloadAction<Institution>) => ({
        //     ...state,
        //     institution: IndexedAdapter.addOne(state.institution, action),
        // }),
        // DeleteInstitution: (state, action: PayloadAction<ID>) => ({
        //     ...state,
        //     institution: IndexedAdapter.removeOne(state.institution, action),
        // }),
        // UpdateInstitution: (state, action: PayloadAction<Update<Institution>>) => ({
        //     ...state,
        //     institution: IndexedAdapter.updateOne(state.institution, action),
        // }),

        // Rules
        // CreateRule: (state, action: PayloadAction<Rule>) => ({
        //     ...state,
        //     rule: IndexedAdapter.addOne(state.rule, action),
        // }),
        // DeleteRule: (state, action: PayloadAction<ID>) => ({
        //     ...state,
        //     rule: IndexedAdapter.removeOne(state.rule, action),
        // }),
        // UpdateRule: (state, action: PayloadAction<Update<Rule>>) => ({
        //     ...state,
        //     rule: IndexedAdapter.updateOne(state.rule, action),
        // }),

        // Transactions
        // CreateTransaction: (state, action: PayloadAction<Transaction>) => ({
        //     ...state,
        //     transaction: BaseAdapter.addOne(state.transaction, action),
        // }),
        // DeleteTransaction: (state, action: PayloadAction<ID>) => ({
        //     ...state,
        //     transaction: BaseAdapter.removeOne(state.transaction, action),
        // }),
        // UpdateTransaction: (state, action: PayloadAction<Update<Transaction>>) => ({
        //     ...state,
        //     transaction: BaseAdapter.updateOne(state.transaction, action),
        // }),

        // User
        UpdateUserCurrency: (state, action: PayloadAction<number>) => ({
            ...state,
            user: {
                currency: action.payload,
            },
        }),
    },
});

const getTransactionSummaries = (
    transactionState: EntityState<Transaction>,
    defaultCurrency: ID,
    currencies: Dictionary<Currency>
) => {
    const balances: Record<ID, Record<ID, BalanceHistory>> = {}; // Account -> Currency -> Balances
    const totals: ["category" | "currency" | "account", Record<ID, TransactionHistory>][] = [
        ["category", {}],
        ["currency", {}],
        ["account", {}],
    ];
    const transactionDates: Record<ID, SDate> = {};

    transactionState.ids
        .map((id) => transactionState.entities[id]!)
        .forEach((tx) => {
            const date = parseDate(tx.date).startOf("month");

            if (!transactionDates[tx.account] && tx.value) transactionDates[tx.account] = tx.date;

            if (tx.value && !tx.transfer) {
                totals.forEach(([type, histories]) => {
                    if (histories[tx[type]] === undefined) histories[tx[type]] = BaseTransactionHistory();

                    const history = histories[tx[type]];
                    const bucket = parseDate(history.start).diff(date, "months")["months"];

                    if (bucket >= history.credits.length) {
                        history.credits = extendHistory(history.credits, bucket);
                        history.debits = extendHistory(history.debits, bucket);
                    }

                    history[tx.value! > 0 ? "credits" : "debits"][bucket] += changeCurrencyValue(
                        currencies[defaultCurrency]!,
                        currencies[tx.currency]!,
                        tx.value!
                    );
                });
            }

            if (tx.balance !== undefined) {
                if (!balances[tx.account]) balances[tx.account] = {};
                if (!balances[tx.account][tx.currency]) balances[tx.account][tx.currency] = BaseBalanceValues();

                const history = balances[tx.account][tx.currency];
                const bucket = parseDate(history.start).diff(date, "months")["months"];

                if (bucket >= history.base.length) {
                    history.base = extendHistory(
                        history.base,
                        bucket,
                        changeCurrencyValue(currencies[defaultCurrency]!, currencies[tx.currency]!, tx.balance)
                    );
                    history.local = extendHistory(history.local, bucket, tx.balance);
                }
            }
        });

    return {
        accountLastTransactionDates: transactionDates,
        accountBalances: balances,
        transactionSummaries: fromPairs(totals) as Record<typeof totals[0][0], Record<ID, TransactionHistory>>,
    };
};
const extendHistory = (history: number[], length: number, fill?: number) =>
    history.concat(range(length + 1 - history.length).map((_) => fill || 0));
const changeCurrencyValue = (to: Currency, from: Currency, value: number) =>
    (value * to.exchangeRate) / from.exchangeRate;

const markAllBalances = (transactionState: EntityState<Transaction>) => {
    const ids = transactionState.ids;
    const entities = cloneDeep(transactionState.entities);
    ids.forEach((id) => {
        entities[id]!.balance = undefined;
    });

    type Accumulator = { balance: number | undefined; previous: number };
    const statefullyUpdateBalances = (
        ids: EntityId[],
        defaultBalance: number | undefined,
        getNewBalance: (tx: Transaction, acc: Accumulator) => number | undefined
    ) =>
        ids.reduce(
            (accumulator, id) => {
                const tx = entities[id]!;
                if (accumulator[tx.account] === undefined) accumulator[tx.account] = {};

                let balance: number | undefined;
                if (tx.balance !== undefined) {
                    balance = tx.balance;
                } else {
                    const old = accumulator[tx.account][tx.currency] || { balance: defaultBalance, previous: 0 };
                    balance = getNewBalance(tx, old);
                    balance = balance !== undefined ? round(balance, 2) : undefined;
                    if (tx.balance !== balance) tx.balance = balance;
                }

                accumulator[tx.account][tx.currency] = { balance, previous: tx.value || 0 };
                return accumulator;
            },
            // Account -> Currency -> Accumulator
            {} as Record<ID, Record<ID, Accumulator | undefined>>
        );

    // Iterate backwards in time, filling balances
    statefullyUpdateBalances(ids, undefined, (tx, acc) =>
        tx?.recordedBalance !== undefined
            ? tx.recordedBalance
            : acc.balance === undefined
            ? undefined
            : acc.balance - acc.previous
    );

    // Iterate forwards in time, filling balances
    statefullyUpdateBalances(reverse(clone(ids)), 0, (tx, acc) =>
        tx?.balance !== undefined ? tx.balance : acc.balance === undefined ? undefined : acc.balance + (tx.value || 0)
    );

    return { ids, entities };
};
