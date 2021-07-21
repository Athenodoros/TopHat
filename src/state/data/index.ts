import {
    createEntityAdapter,
    createNextState,
    createSlice,
    Dictionary,
    EntityId,
    EntityState,
    PayloadAction,
} from "@reduxjs/toolkit";
import { clone, fromPairs, isEqual, range, reverse, round, toPairs, uniq, uniqWith, zipObject } from "lodash";
import { takeWithDefault } from "../../utilities/data";
import { DeleteTransactionSelectionState, SaveTransactionSelectionState } from "../utilities/actions";
import { BaseBalanceValues, getCurrentMonth, getCurrentMonthString, ID, parseDate } from "../utilities/values";
import { DEFAULT_CURRENCY, DemoObjects } from "./demo";
import { Account, Category, Currency, Institution, Notification, Rule, Transaction, UserState } from "./types";
import { changeCurrencyValue, PLACEHOLDER_CATEGORY, PLACEHOLDER_INSTITUTION, TRANSFER_CATEGORY } from "./utilities";
export type { Account, Category, Currency, Institution, Notification, Rule, Transaction } from "./types";
export { changeCurrencyValue, PLACEHOLDER_CATEGORY_ID, PLACEHOLDER_INSTITUTION_ID } from "./utilities";

const BaseAdapter = createEntityAdapter();
const IndexedAdapter = createEntityAdapter<{ index: number }>({ sortComparer: (a, b) => a.index - b.index });
const DateAdapter = createEntityAdapter<Transaction>({ sortComparer: (a, b) => -a.date.localeCompare(b.date) });
const getInitialState = <T extends { id: ID }>(initial?: T[]) => {
    if (!initial) return { ids: [], entities: {} };

    const ids = initial.map(({ id }) => id);
    return { ids, entities: zipObject(ids, initial) };
};

export interface DataState {
    account: EntityState<Account>;
    category: EntityState<Category>;
    currency: EntityState<Currency>;
    institution: EntityState<Institution>;
    rule: EntityState<Rule>;
    transaction: EntityState<Transaction>;
    user: UserState;
    notification: EntityState<Notification>;
}

const defaults = {
    account: getInitialState<Account>(),
    category: getInitialState<Category>([PLACEHOLDER_CATEGORY, TRANSFER_CATEGORY]),
    currency: getInitialState<Currency>([DEFAULT_CURRENCY]),
    institution: getInitialState<Institution>([PLACEHOLDER_INSTITUTION]),
    rule: getInitialState<Rule>(),
    transaction: getInitialState<Transaction>(),
    user: { currency: 1, isDemo: false },
    notification: getInitialState<Notification>(),
} as DataState;

type TransactionSummary = "category" | "currency" | "account";
const TransactionSummaries = ["category", "currency", "account"] as TransactionSummary[];

// Create Slice automatically wraps reducer functions with Immer objects to allow mutation
// See docs here: https://redux-toolkit.js.org/usage/immer-reducers
export const DataSlice = createSlice({
    name: "data",
    initialState: defaults,
    reducers: {
        reset: () => defaults,
        set: (_, action: PayloadAction<DataState>) => action.payload,
        // resetToDefaultState: () => defaults,
        setUpDemo: () => {
            const state: DataState = {
                account: IndexedAdapter.addMany(defaults.account, DemoObjects.account),
                category: IndexedAdapter.addMany(defaults.category, DemoObjects.category),
                currency: IndexedAdapter.addMany(defaults.currency, DemoObjects.currency),
                institution: IndexedAdapter.addMany(defaults.institution, DemoObjects.institution),
                rule: IndexedAdapter.addMany(defaults.rule, DemoObjects.rule),
                transaction: DateAdapter.addMany(defaults.transaction, DemoObjects.transaction),
                user: { ...defaults.user, isDemo: true },
                notification: BaseAdapter.addMany(defaults.notification, DemoObjects.notification),
            };

            return createNextState(state, (state) => {
                updateTransactionSummariesWithTransactions(state, state.transaction.ids);
                fillTransactionBalances(state.transaction);
                updateAccountTransactionDates(state);
                updateBalanceSummaries(state);
            });
        },

        // Notifications
        deleteNotification: (state, { payload }: PayloadAction<ID>) =>
            void BaseAdapter.removeOne(state.notification, payload),
    },
    extraReducers: (builder) => {
        builder
            .addCase(SaveTransactionSelectionState, (state, { payload: { ids, edits } }) => {
                updateTransactionSummaryStartDates(state);
                updateTransactionSummariesWithTransactions(state, ids, true);

                DateAdapter.updateMany(
                    state.transaction,
                    ids.map((id) => ({
                        id,
                        changes: fromPairs(toPairs(edits).filter(([_, value]) => value !== undefined)),
                    }))
                );
                const balanceSubset = getBalanceSubset(ids, state.transaction.entities);

                updateTransactionSummariesWithTransactions(state, ids);
                fillTransactionBalances(state.transaction, balanceSubset);
                updateAccountTransactionDates(state, uniq(balanceSubset.map(({ account }) => account)));
                updateBalanceSummaries(state, balanceSubset);
            })
            .addCase(DeleteTransactionSelectionState, (state, { payload: ids }) => {
                const balanceSubset = getBalanceSubset(ids, state.transaction.entities);

                updateTransactionSummaryStartDates(state);
                updateTransactionSummariesWithTransactions(state, ids, true);
                DateAdapter.removeMany(state.transaction, ids);
                fillTransactionBalances(state.transaction, balanceSubset);
                updateAccountTransactionDates(state, uniq(balanceSubset.map(({ account }) => account)));
                updateBalanceSummaries(state, balanceSubset);
            });
    },
});

const getDateBucket = (date: string, start: string) =>
    parseDate(start).diff(parseDate(date).startOf("month"), "months")["months"];

type BalanceSubset = { account: ID; currency: ID }[];
const getBalanceSubset = (ids: EntityId[], entities: Dictionary<Transaction>) =>
    uniqWith(
        // Can't use _.pick, because it doesn't work with WritableDraft
        ids.map((id) => ({ currency: entities[id]!.currency, account: entities[id]!.account })),
        isEqual
    );
const getFullBalanceSubset = ({ ids, entities }: EntityState<Transaction>) => {
    const subset: Record<EntityId, Set<ID>> = {}; // Account -> Currency[]

    ids.forEach((id) => {
        const { account, currency } = entities[id]!;
        if (subset[account] === undefined) subset[account] = new Set();

        subset[account].add(currency);
    });

    return toPairs(subset).flatMap(([account, currencies]) =>
        Array.from(currencies).map((currency) => ({ account, currency }))
    );
};
// ids.flatMap((id) =>
//     keys(entities[id]!.balances).map((currency) => ({ account: Number(id), currency: Number(currency) }))
// );

const updateTransactionSummaryStartDates = (state: DataState) => {
    TransactionSummaries.forEach((category) => {
        state[category].ids.forEach((id) => {
            const history = state[category].entities[id]!.transactions;
            const difference = getCurrentMonth().diff(parseDate(history.start), "months").months;
            if (difference !== 0) {
                history.start = getCurrentMonthString();
                history.credits = range(difference)
                    .map((_) => 0)
                    .concat(history.credits);
                history.debits = range(difference)
                    .map((_) => 0)
                    .concat(history.debits);
            }
        });
    });
};

// This assumes that no transactions will exist before the relevant transaction; history.start dates
const updateTransactionSummariesWithTransactions = (state: DataState, ids?: EntityId[], remove?: boolean) => {
    const userDefaultCurrency = state.currency.entities[state.user.currency]!;

    (ids || state.transaction.ids).forEach((id) => {
        const tx = state.transaction.entities[id]!;
        if (!tx.value) return;

        TransactionSummaries.forEach((summary) => {
            if (tx[summary] === null) return;

            const history = state[summary].entities[tx[summary]]!.transactions;

            const bucket = getDateBucket(tx.date, history.start);

            if (bucket >= history.credits.length) {
                history.credits = takeWithDefault(history.credits, bucket + 1, 0);
                history.debits = takeWithDefault(history.debits, bucket + 1, 0);
            }

            history[tx.value! > 0 ? "credits" : "debits"][bucket] += changeCurrencyValue(
                userDefaultCurrency,
                state.currency.entities[tx.currency]!,
                (remove ? -1 : 1) * tx.value!
            );
        });
    });
};

const fillTransactionBalances = ({ ids, entities }: EntityState<Transaction>, subset?: BalanceSubset) => {
    if (subset)
        ids = ids.filter((id) =>
            subset.some(
                ({ currency, account }) => entities[id]!.currency === currency && entities[id]!.account === account
            )
        );
    // entities = cloneDeep(entities);

    ids.forEach((id) => {
        entities[id]!.balance = null;
    });

    type Accumulator = { balance: number | null; previous: number };
    const statefullyUpdateBalances = (
        ids: EntityId[],
        defaultBalance: number | null,
        getNewBalance: (tx: Transaction, acc: Accumulator) => number | null
    ) =>
        ids.reduce(
            (accumulator, id) => {
                const tx = entities[id]!;
                if (accumulator[tx.account] === undefined) accumulator[tx.account] = {};

                let balance: number | null;
                if (tx.balance !== null) {
                    balance = tx.balance;
                } else {
                    const old = accumulator[tx.account][tx.currency] || { balance: defaultBalance, previous: 0 };
                    balance = getNewBalance(tx, old);
                    balance = balance !== null ? round(balance, 2) : null;
                    if (tx.balance !== balance) tx.balance = balance;
                }

                accumulator[tx.account][tx.currency] = { balance, previous: tx.value || 0 };
                return accumulator;
            },
            // Account -> Currency -> Accumulator
            {} as Record<ID, Record<ID, Accumulator | undefined>>
        );

    // Iterate backwards in time, filling balances
    statefullyUpdateBalances(ids, null, (tx, acc) =>
        tx?.recordedBalance !== null ? tx.recordedBalance : acc.balance === null ? null : acc.balance - acc.previous
    );

    // Iterate forwards in time, filling balances
    statefullyUpdateBalances(reverse(clone(ids)), 0, (tx, acc) =>
        tx?.balance !== null ? tx.balance : acc.balance === null ? null : acc.balance + (tx.value || 0)
    );
};

const updateAccountTransactionDates = (data: DataState, subset?: EntityId[]) => {
    (subset || data.account.ids).forEach((id) => {
        data.account.entities[id]!.firstTransactionDate = undefined;
        data.account.entities[id]!.lastTransactionDate = undefined;
    });

    data.transaction.ids.forEach((id) => {
        const tx = data.transaction.entities[id]!;
        if (subset && !subset.includes(tx.account)) return;
        const account = data.account.entities[tx.account]!;

        if (!account.firstTransactionDate || account.firstTransactionDate > tx.date)
            account.firstTransactionDate = tx.date;
        if (!account.lastTransactionDate || account.lastTransactionDate < tx.date)
            account.lastTransactionDate = tx.date;
    });
};

const updateBalanceSummaries = (data: DataState, subset?: BalanceSubset) => {
    // Reset Balances
    (subset || getFullBalanceSubset(data.transaction)).forEach(({ account, currency }) => {
        data.account.entities[account]!.balances[currency] = BaseBalanceValues();
    });

    const userDefaultCurrency = data.currency.entities[data.user.currency]!;
    data.transaction.ids.forEach((id) => {
        const tx = data.transaction.entities[id]!;
        if (tx.balance === null) return;
        if (subset && !subset.some(({ currency, account }) => tx.currency === currency && tx.account === account))
            return;

        const history = data.account.entities[tx.account]!.balances[tx.currency];
        const bucket = getDateBucket(tx.date, history.start);

        if (bucket >= history.localised.length) {
            history.localised = takeWithDefault(
                history.localised,
                bucket + 1,
                changeCurrencyValue(userDefaultCurrency, data.currency.entities[tx.currency]!, tx.balance)
            );
            history.original = takeWithDefault(history.original, bucket + 1, tx.balance);
        }
    });
};
