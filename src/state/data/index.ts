import { createEntityAdapter, createSlice, Dictionary, EntityId, EntityState, PayloadAction } from "@reduxjs/toolkit";
import { clone, fromPairs, isEqual, reverse, round, toPairs, uniqWith } from "lodash";
import { takeWithDefault, zipObject } from "../../utilities/data";
import { DeleteTransactionSelectionState, SaveTransactionSelectionState } from "../utilities/actions";
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
import { Account, Category, Currency, Institution, Notification, Rule, Transaction } from "./types";
import { changeCurrencyValue, PLACEHOLDER_CATEGORY, PLACEHOLDER_INSTITUTION } from "./utilities";
export type { Account, Category, Currency, Institution, Notification, Rule, Transaction } from "./types";
export { changeCurrencyValue, PLACEHOLDER_CATEGORY_ID, PLACEHOLDER_INSTITUTION_ID } from "./utilities";

const BaseAdapter = createEntityAdapter();
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
    notifications: EntityState<Notification>;
}

const defaults = {
    account: IndexedAdapter.getInitialState() as EntityState<Account>,
    category: IndexedAdapter.getInitialState() as EntityState<Category>,
    currency: IndexedAdapter.getInitialState() as EntityState<Currency>,
    institution: IndexedAdapter.getInitialState() as EntityState<Institution>,
    rule: IndexedAdapter.getInitialState() as EntityState<Rule>,
    transaction: DateAdapter.getInitialState() as EntityState<Transaction>,
    user: { currency: 1 },
    notifications: BaseAdapter.getInitialState() as EntityState<Notification>,
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
        setUpDemo: () => {
            const transactions = DateAdapter.addMany(defaults.transaction, DemoObjects.transactions);
            updateBalancesInPlace(transactions);

            const currencies = zipObject(
                DemoObjects.currencies.map(({ id }) => id),
                DemoObjects.currencies
            );
            const { accountLastTransactionDates, transactionSummaries } = getTransactionSummaries(
                transactions,
                defaults.user.currency,
                currencies
            );
            const accountBalances = getBalanceSummaries(transactions, defaults.user.currency, currencies);

            return {
                account: IndexedAdapter.addMany(
                    defaults.account,
                    DemoObjects.accounts.map((account) => ({
                        ...account,
                        lastTransactionDate: accountLastTransactionDates[account.id],
                        balances: accountBalances[account.id] || {},
                        transactions: transactionSummaries.account[account.id] || BaseTransactionHistory(),
                        currencies: toPairs(accountBalances[account.id] || {})
                            .filter(([_, balances]) => balances.localised[0])
                            .map(([idStr, _]) => Number(idStr)),
                    }))
                ),
                category: IndexedAdapter.addMany(
                    defaults.category,
                    DemoObjects.categories.concat([PLACEHOLDER_CATEGORY]).map((category) => ({
                        ...category,
                        transactions: transactionSummaries.category[category.id] || BaseTransactionHistory(),
                    }))
                ),
                currency: IndexedAdapter.addMany(
                    defaults.currency,
                    DemoObjects.currencies.map((currency) => ({
                        ...currency,
                        transactions: transactionSummaries.currency[currency.id] || BaseTransactionHistory(),
                    }))
                ),
                institution: IndexedAdapter.addMany(
                    defaults.institution,
                    DemoObjects.institutions.concat([PLACEHOLDER_INSTITUTION])
                ),
                rule: IndexedAdapter.addMany(defaults.rule, DemoObjects.rules),
                transaction: transactions,
                user: defaults.user,
                notifications: BaseAdapter.addMany(defaults.notifications, DemoObjects.notifications),
            };
        },

        // User
        updateUserCurrency: (state, { payload }: PayloadAction<number>) => {
            state.user.currency = payload;
        },

        // Notifications
        deleteNotification: (state, { payload }: PayloadAction<ID>) =>
            void BaseAdapter.removeOne(state.notifications, payload),
    },
    extraReducers: (builder) => {
        builder
            .addCase(SaveTransactionSelectionState, (state, { payload: { ids, edits } }) => {
                // Update transaction summaries
                // ids.forEach(id => {
                //     const tx = state.transaction.entities[id]!;
                //     if (edits.date) {
                //         changeTransactionHistory(state, tx.date, -tx.value, )
                //     }
                // })

                // Update transactions
                DateAdapter.updateMany(
                    state.transaction,
                    ids.map((id) => ({
                        id,
                        changes: fromPairs(toPairs(edits).filter(([_, value]) => value !== undefined)),
                    }))
                );

                // Update balances and summaries
            })
            .addCase(DeleteTransactionSelectionState, (state, { payload: ids }) => {
                const transactions = ids.map((id) => state.transaction.entities[id]!);

                // Update transaction summaries
                transactions.forEach((tx) => changeTransactionHistory(state, tx, true));

                // Delete transactions
                DateAdapter.removeMany(state.transaction, ids);

                // Update balances and summaries
                const subset = uniqWith(
                    // Can't use _.pick, because it doesn't work with WritableDraft
                    transactions.map(({ currency, account }) => ({ currency, account })),
                    isEqual
                );
                updateBalancesInPlace(state.transaction, subset);
                toPairs(
                    getBalanceSummaries(state.transaction, state.user.currency, state.currency.entities, subset)
                ).forEach(([account, balances]) => {
                    const current = state.account.entities[Number(account)]!.balances;
                    toPairs(balances).forEach(([currency, history]) => {
                        current[Number(currency)] = history;
                    });
                });
            });
    },
});

const changeTransactionHistory = (
    state: DataState,
    tx: Pick<Transaction, "value" | "date" | TransactionSummary>,
    remove?: boolean
) => {
    if (!tx.value) return;

    TransactionSummaries.forEach((summary) => {
        const history = state[summary].entities[tx[summary]]!.transactions;
        const bucket = getDateBucket(tx.date, history.start);
        const value = changeCurrencyValue(
            state.currency.entities[state.user.currency]!,
            state.currency.entities[tx.currency]!,
            (remove ? -1 : 1) * tx.value!
        );
        history[tx.value! > 0 ? "credits" : "debits"][bucket] += value;
    });
};

// const updateTransactionSummary = (history: TransactionHistory) => {
//     const difference = getCurrentMonth().diff(parseDate(history.start), "months").months;
//     if (difference !== 0) {
//         history.start = getCurrentMonthString();
//         history.credits = range(difference)
//             .map((_) => 0)
//             .concat(history.credits);
//         history.debits = range(difference)
//             .map((_) => 0)
//             .concat(history.debits);
//     }
// };

// const updateBalanceHistory = (history: BalanceHistory) => {
//     const difference = getCurrentMonth().diff(parseDate(history.start), "months").months;
//     if (difference !== 0) {
//         history.start = getCurrentMonthString();
//         history.localised = range(difference)
//             .map((_) => 0)
//             .concat(history.localised);
//         history.original = range(difference)
//             .map((_) => 0)
//             .concat(history.original);
//     }
// };

const getDateBucket = (date: string, start: string) =>
    parseDate(start).diff(parseDate(date).startOf("month"), "months")["months"];

const getBalanceSummaries = (
    transactionState: EntityState<Transaction>,
    defaultCurrency: ID,
    currencies: Dictionary<Currency>,
    subset?: { currency: ID; account: ID }[]
) => {
    const balances: Record<ID, Record<ID, BalanceHistory>> = {}; // Account -> Currency -> Balances

    transactionState.ids.forEach((id) => {
        const tx = transactionState.entities[id]!;
        if (tx.balance === null) return;
        if (subset && !subset.some(({ currency, account }) => tx.currency === currency && tx.account === account))
            return;

        if (!balances[tx.account]) balances[tx.account] = {};
        if (!balances[tx.account][tx.currency]) balances[tx.account][tx.currency] = BaseBalanceValues();

        const history = balances[tx.account][tx.currency];
        const bucket = getDateBucket(tx.date, history.start);

        if (bucket >= history.localised.length) {
            history.localised = takeWithDefault(
                history.localised,
                bucket + 1,
                changeCurrencyValue(currencies[defaultCurrency]!, currencies[tx.currency]!, tx.balance)
            );
            history.original = takeWithDefault(history.original, bucket + 1, tx.balance);
        }
    });
    return balances;
};

const getTransactionSummaries = (
    transactionState: EntityState<Transaction>,
    defaultCurrency: ID,
    currencies: Dictionary<Currency>
) => {
    const totals: [typeof TransactionSummaries[number], Record<ID, TransactionHistory>][] = TransactionSummaries.map(
        (key) => [key, {}]
    );
    const transactionDates: Record<ID, SDate> = {};

    transactionState.ids.forEach((id) => {
        const tx = transactionState.entities[id]!;

        if (!transactionDates[tx.account] && tx.value) transactionDates[tx.account] = tx.date;

        if (tx.value && !tx.transfer) {
            totals.forEach(([type, histories]) => {
                if (tx[type] === undefined) return;
                if (histories[tx[type]!] === undefined) histories[tx[type]!] = BaseTransactionHistory();

                const history = histories[tx[type]!];
                const bucket = getDateBucket(tx.date, history.start);

                if (bucket >= history.credits.length) {
                    history.credits = takeWithDefault(history.credits, bucket + 1, 0);
                    history.debits = takeWithDefault(history.debits, bucket + 1, 0);
                }

                history[tx.value! > 0 ? "credits" : "debits"][bucket] += changeCurrencyValue(
                    currencies[defaultCurrency]!,
                    currencies[tx.currency]!,
                    tx.value!
                );
            });
        }
    });

    return {
        accountLastTransactionDates: transactionDates,
        transactionSummaries: fromPairs(totals) as Record<typeof totals[0][0], Record<ID, TransactionHistory>>,
    };
};

const updateBalancesInPlace = (
    { ids, entities }: EntityState<Transaction>,
    subset?: { currency: ID; account: ID }[]
) => {
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
