import {
    createEntityAdapter,
    createNextState,
    createSlice,
    Dictionary,
    EntityAdapter,
    EntityId,
    EntityState,
    PayloadAction,
    Update,
} from "@reduxjs/toolkit";
import { createDraft } from "immer";
import { WritableDraft } from "immer/dist/internal";
import {
    clone,
    cloneDeep,
    fromPairs,
    get,
    isEqual,
    keys,
    range,
    reverse,
    round,
    toPairs,
    uniq,
    uniqWith,
    upperFirst,
} from "lodash";
import { AnyAction } from "redux";
import { mapValuesWithKeys, takeWithDefault, updateListSelection } from "../../shared/data";
import { useSelector } from "../shared/hooks";
import {
    BaseBalanceValues,
    formatDate,
    getCurrentMonth,
    getCurrentMonthString,
    ID,
    parseDate,
    TransactionHistory,
    TransactionHistoryWithLocalisation,
} from "../shared/values";
import { DEFAULT_CURRENCY, DemoObjects, finishDemoInitialisation } from "./demo";
import {
    changeCurrencyValue,
    compareTransactionsDescendingDates,
    DEFAULT_USER_VALUE,
    PLACEHOLDER_CATEGORY,
    PLACEHOLDER_INSTITUTION,
    PLACEHOLDER_STATEMENT,
    PLACEHOLDER_STATEMENT_ID,
    TRANSFER_CATEGORY,
    TRANSFER_CATEGORY_ID,
} from "./shared";
import {
    Account,
    BasicObjectName,
    BasicObjectType,
    Category,
    Currency,
    DataState,
    EditTransactionState,
    StubUserID,
    Transaction,
    User,
} from "./types";
export { changeCurrencyValue, PLACEHOLDER_CATEGORY_ID, PLACEHOLDER_INSTITUTION_ID } from "./shared";
export type {
    Account,
    Category,
    Currency,
    DataState,
    EditTransactionState,
    Institution,
    Notification,
    Rule,
    Statement,
    Transaction,
} from "./types";

const BaseAdapter = createEntityAdapter<object>();
const NameAdapter = createEntityAdapter<{ name: string }>({ sortComparer: (a, b) => a.name.localeCompare(b.name) });
const IndexedAdapter = createEntityAdapter<{ index: number }>({ sortComparer: (a, b) => a.index - b.index });
const DateAdapter = createEntityAdapter<Transaction>({ sortComparer: compareTransactionsDescendingDates });

const BaseObjects = {
    category: [PLACEHOLDER_CATEGORY, TRANSFER_CATEGORY],
    currency: [DEFAULT_CURRENCY],
    institution: [PLACEHOLDER_INSTITUTION],
    statement: [PLACEHOLDER_STATEMENT],
};

const adapters: Record<keyof DataState, EntityAdapter<any>> = {
    account: BaseAdapter,
    category: BaseAdapter,
    currency: NameAdapter,
    institution: NameAdapter,
    rule: IndexedAdapter,
    transaction: DateAdapter,
    statement: BaseAdapter,
    notification: BaseAdapter,
    user: BaseAdapter,
};

export const updateUserData = (state: DataState, changes: Partial<User>) =>
    adapters.user.updateOne(state.user, { id: StubUserID, changes });

export const ensureNotificationExists = (data: DataState, id: string, contents: string) =>
    (data.notification = adapters.notification.upsertOne(data.notification, { id, contents }));

export const removeNotification = (data: DataState, id: string) =>
    (data.notification = adapters.notification.removeOne(data.notification, id));

// Does not contain a user object
const DataBaseline: DataState = mapValuesWithKeys(adapters, (name, adapter) =>
    adapter.addMany(adapter.getInitialState(), get(BaseObjects, name, []))
);

export type ListDataState = {
    [Key in keyof DataState]: DataState[Key] extends EntityState<infer T> ? T[] : DataState[Key];
};

const initialTutorialState = {
    ...DataBaseline,
    user: adapters.user.addOne(adapters.user.getInitialState(), { ...DEFAULT_USER_VALUE, tutorial: true }),
};

// Create Slice automatically wraps reducer functions with Immer objects to allow mutation
// See docs here: https://redux-toolkit.js.org/usage/immer-reducers
export const DataSlice = createSlice({
    name: "data",
    initialState: initialTutorialState,
    reducers: {
        restartTutorial: () => initialTutorialState,
        reset: () => ({
            ...DataBaseline,
            user: adapters.user.addOne(adapters.user.getInitialState(), DEFAULT_USER_VALUE),
        }),
        set: (_, { payload }: PayloadAction<DataState>) => payload,
        setFromLists: (_, { payload }: PayloadAction<ListDataState>) =>
            mapValuesWithKeys(adapters, (name, adapter) => adapter.addMany(adapter.getInitialState(), payload[name])),
        setUpDemo: () => {
            const state = mapValuesWithKeys(adapters, (name, adapter) =>
                adapter.addMany(cloneDeep(DataBaseline[name]), DemoObjects[name])
            ) as DataState;

            // This is necessary because the EntityAdapters freeze objects when they are added
            return createNextState(state, (state) => {
                updateTransactionSummariesWithTransactions(state, state.transaction.ids);

                updateBalancesAndAccountSummaries(state);
                updateCategoryTransactionDates(state);

                finishDemoInitialisation(state);
            });
        },
        updateSimpleObjects: <Name extends "rule">(
            state: DataState,
            { payload }: PayloadAction<{ type: Name; updates: readonly Update<BasicObjectType[Name]>[] }>
        ) => {
            adapters[payload.type].updateMany(state[payload.type], payload.updates);
        },
        createSimpleObjects: <Name extends "rule" | "statement">(
            state: DataState,
            { payload }: PayloadAction<{ type: Name; objects: readonly BasicObjectType[Name][] }>
        ) => {
            adapters[payload.type].addMany(state[payload.type], payload.objects);
        },

        // Custom updates for objects with flow-on effects or calculated fields
        updateAccount: (
            state,
            {
                payload,
            }: PayloadAction<{
                id: ID;
                changes: Omit<
                    Partial<Account>,
                    "id" | "firstTransactionDate" | "lastTransactionDate" | "balances" | "transactions"
                >;
            }>
        ) => {
            adapters.account.updateOne(state.account, payload);
        },
        updateCategoryBudgets: (state, { payload }: PayloadAction<Record<ID, number>>) => {
            keys(payload).forEach((id) => {
                const budget = state.category.entities[Number(id)]!.budgets;
                if (budget) budget.values[0] = payload[Number(id)];
            });
        },
        addNewTransactions: (
            state,
            {
                payload: { transactions, transfers = [] },
            }: PayloadAction<{ transactions: Transaction[]; transfers?: ID[] }>
        ) => {
            updateTransactionSummaryStartDates(state);
            updateTransactionSummariesWithTransactions(state, transfers, true);

            adapters.transaction.updateMany(
                state.transaction,
                transfers.map((id) => ({ id, changes: { category: TRANSFER_CATEGORY_ID } }))
            );
            // Actions make arguments read-only, which breaks the balance calculations
            adapters.transaction.addMany(state.transaction, cloneDeep(transactions));

            const transactionIDs = transactions.map(({ id }) => id);
            updateTransactionSummariesWithTransactions(state, transfers.concat(transactionIDs));
            updateBalancesAndAccountSummaries(state, getBalanceSubset(transactionIDs, state.transaction.entities));
            updateCategoryTransactionDates(
                state,
                uniq(transactionIDs.map((id) => state.transaction.entities[id]!.category))
            );
        },
        updateTransactions: (
            state,
            { payload: { ids, edits } }: PayloadAction<{ ids: ID[]; edits: EditTransactionState }>
        ) => {
            const oldBalanceSubset = getBalanceSubset(ids, state.transaction.entities);

            updateTransactionSummaryStartDates(state);
            updateTransactionSummariesWithTransactions(state, ids, true);

            adapters.transaction.updateMany(
                state.transaction,
                ids.map((id) => ({
                    id,
                    changes: fromPairs(toPairs(edits).filter(([_, value]) => value !== undefined)),
                }))
            );

            const newBalanceSubset = getBalanceSubset(ids, state.transaction.entities);
            updateTransactionSummariesWithTransactions(state, ids);
            updateBalancesAndAccountSummaries(state, uniqWith(oldBalanceSubset.concat(newBalanceSubset), isEqual));
        },
        deleteTransactions: (state, { payload: ids }: PayloadAction<ID[]>) => {
            const balanceSubset = getBalanceSubset(ids, state.transaction.entities);

            updateTransactionSummaryStartDates(state);
            updateTransactionSummariesWithTransactions(state, ids, true);
            adapters.transaction.removeMany(state.transaction, ids);

            updateBalancesAndAccountSummaries(state, balanceSubset);
        },

        saveObject: <Type extends BasicObjectName>(
            state: WritableDraft<DataState>,
            { payload: { type, working } }: PayloadAction<{ type: Type; working: BasicObjectType[Type] }>
        ) => {
            const original = state[type].entities[working.id] as BasicObjectType[Type] | undefined;

            // Updating existing
            if (
                original &&
                type === "currency" &&
                !isEqual((working as Currency).rates, (original as Currency).rates)
            ) {
                // Update local values if exchange rate changes
                const transactions = state.transaction.ids.filter(
                    (id) => state.transaction.entities[id]!.currency === working.id
                );

                updateTransactionSummariesWithTransactions(state, transactions, true);

                // Don't overwrite transaction summary with old version
                const draft = createDraft(working as Currency);
                draft.transactions = state.currency.entities[working.id]!.transactions;
                adapters.currency.upsertOne(state.currency, draft);

                updateTransactionSummariesWithTransactions(state, transactions);
                updateBalancesAndAccountSummaries(state, getBalanceSubset(transactions, state.transaction.entities));
            } else if (
                original &&
                type === "category" &&
                (working as Category).hierarchy[0] !== (original as Category).hierarchy[0]
            ) {
                updateTransactionSummaryStartDates(state);
                const { transactions } = original as Category;
                (original as Category).hierarchy.forEach((id) => {
                    // Remove old hierarchy
                    const parent = state.category.entities[id]!;

                    transactions.credits.forEach((credit, idx) => {
                        parent.transactions.credits[idx] -= credit;
                    });
                    transactions.debits.forEach((debit, idx) => {
                        parent.transactions.debits[idx] -= debit;
                    });
                    parent.transactions.count -= transactions.count;
                });
                (working as Category).hierarchy.forEach((id) => {
                    // Add old hierarchy
                    const parent = state.category.entities[id]!;

                    transactions.credits.forEach((credit, idx) => {
                        parent.transactions.credits[idx] += credit;
                    });
                    transactions.debits.forEach((debit, idx) => {
                        parent.transactions.debits[idx] += debit;
                    });
                    parent.transactions.count += transactions.count;
                });

                state.category.ids.forEach((id) => {
                    const candidate = state.category.entities[id]!;

                    if (candidate.hierarchy.includes(working.id)) {
                        candidate.hierarchy = candidate.hierarchy
                            .slice(0, candidate.hierarchy.indexOf(working.id) + 1)
                            .concat((working as Category).hierarchy);
                    }
                });

                adapters[type].upsertOne(state[type], working);
            } else {
                adapters[type].upsertOne(state[type], working);
            }
        },
        deleteObject: (state, { payload: { type, id } }: PayloadAction<{ type: BasicObjectName; id: ID }>) => {
            if (deleteObjectError(state, type, id) !== undefined) return;

            adapters[type].removeOne(state[type], id);

            if (type === "rule") {
                const { index } = state.rule.entities[id]!;
                adapters.rule.updateMany(
                    state.rule,
                    state.rule.ids
                        .filter((ruleID) => state.rule.entities[ruleID]!.index > index)
                        .map((ruleID) => ({ id: ruleID, changes: { index: state.rule.entities[ruleID]!.index - 1 } }))
                );
            }

            if (type === "statement") {
                state.transaction.ids.forEach((txID) => {
                    const tx = state.transaction.entities[txID]!;
                    if (tx.statement === id) {
                        tx.statement = PLACEHOLDER_STATEMENT_ID;
                    }
                });
            }
        },

        // Notifications
        updateNotificationState: (
            state,
            {
                payload: { user, id, contents },
            }: PayloadAction<{ user: Partial<User>; id: string; contents?: string | null }>
        ) => {
            adapters.user.updateOne(state.user, { id: StubUserID, changes: user });
            if (contents === null) adapters.notification.removeOne(state.notification, id);
            else if (contents !== undefined) adapters.notification.upsertOne(state.notification, { id, contents });
        },
        deleteNotification: (state, { payload }: PayloadAction<string>) =>
            void adapters.notification.removeOne(state.notification, payload),
        toggleNotification: (state, { payload }: PayloadAction<string>) => {
            adapters.user.updateOne(state.user, {
                id: StubUserID,
                changes: {
                    disabled: updateListSelection(payload, state.user.entities[StubUserID]!.disabled),
                },
            });
        },

        updateUserPartial: (state, { payload }: PayloadAction<Partial<User>>) =>
            void adapters.user.updateOne(state.user, { id: StubUserID, changes: payload }),

        // syncIDBChanges: (state, { payload: changes }: PayloadAction<IDatabaseChange[]>) => {
        //     changes.forEach((change) => {
        //         const table = (change.table === "transaction_" ? "transaction" : change.table) as keyof DataState;

        //         if (table === "user") {
        //             if (change.type === 2) state.user = change.obj;
        //             return;
        //         }
        //         if (change.type === 3) adapters[table].removeOne(state[table], change.key);
        //         else adapters[table].upsertOne(state[table], change.obj);
        //     });
        // },
    },
});

export type DataUpdateListener = (previous: DataState | undefined, next: DataState) => void;
const listeners: DataUpdateListener[] = [];
const oldReducer = DataSlice.reducer; // Separate assignment to prevent infinite recursion
DataSlice.reducer = (state: DataState | undefined, action: AnyAction) => {
    const newState = oldReducer(state, action);
    if (!isEqual(state, newState)) {
        return createNextState(newState, (newState) => {
            listeners.forEach((listener) => listener(state, newState));
        });
    }
    return newState;
};
export const subscribeToDataUpdates = (listener: DataUpdateListener) => void listeners.push(listener);

export const useDeleteObjectError = <Type extends BasicObjectName>(type: Type, id: ID) =>
    useSelector((state) => deleteObjectError(state.data, type, id));

const deleteObjectError = <Type extends BasicObjectName>(state: DataState, type: Type, id: ID) => {
    if (!(id in state[type].entities)) return upperFirst(type) + " is newly created";

    if (type === "account") {
        if (state.account.entities[id]!.transactions.count !== 0) return "Account has linked transactions";
        if (state.statement.ids.some((candidate) => state.statement.entities[candidate]!.account === id))
            return "Account has linked statements";
    }

    if (type === "institution") {
        if (state.account.ids.some((candidate) => state.account.entities[candidate]!.institution === id))
            return "Institution has linked accounts";
    }

    if (type === "category") {
        if (state.category.ids.some((candidate) => state.category.entities[candidate]!.hierarchy.includes(id)))
            return "category has children" as const;
        if (state.category.entities[id]!.transactions.count !== 0) return "Category has linked transactions";
    }

    if (type === "currency") {
        if (state.currency.entities[id]!.transactions.count !== 0) return "Currency has linked transactions";
        if (state.user.entities[StubUserID]!.currency === id) return "Can't delete default currency";
    }
};

export const getDateBucket = (date: string, start: string) =>
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

type TransactionSummary = "category" | "currency" | "account";
const TransactionSummaries = ["category", "currency", "account"] as TransactionSummary[];

const updateTransactionSummaryStartDates = (state: DataState) => {
    TransactionSummaries.forEach((category) => {
        state[category].ids.forEach((id) => {
            const history = state[category].entities[id]!.transactions;
            const difference = getCurrentMonth().diff(parseDate(history.start), "months").months;
            if (difference !== 0) {
                const extend = (values: number[]) =>
                    range(difference)
                        .map((_) => 0)
                        .concat(values);

                history.start = getCurrentMonthString();
                history.credits = extend(history.credits);
                history.debits = extend(history.debits);

                if ("localCredits" in history) {
                    history.localCredits = extend(history.localCredits);
                    history.localDebits = extend(history.localDebits);
                }
            }
        });
    });
};

// This extends history into the past, but assumes that `history.start` is up-to-date
const updateTransactionSummariesWithTransactions = (state: DataState, ids?: EntityId[], remove?: boolean) => {
    const userDefaultCurrency = state.currency.entities[state.user.entities[StubUserID]!.currency]!;

    const updateHistoryValue = (history: TransactionHistory | TransactionHistoryWithLocalisation, tx: Transaction) => {
        history.count = history.count + (remove ? -1 : 1);

        if (!tx.value || tx.category === TRANSFER_CATEGORY_ID) return;

        const bucket = getDateBucket(tx.date, history.start);

        if (bucket >= history.credits.length) {
            history.credits = takeWithDefault(history.credits, bucket + 1, 0);
            history.debits = takeWithDefault(history.debits, bucket + 1, 0);

            if ("localCredits" in history) {
                history.localCredits = takeWithDefault(history.localCredits, bucket + 1, 0);
                history.localDebits = takeWithDefault(history.localDebits, bucket + 1, 0);
            }
        }

        history[tx.value! > 0 ? "credits" : "debits"][bucket] += changeCurrencyValue(
            userDefaultCurrency,
            state.currency.entities[tx.currency]!,
            (remove ? -1 : 1) * tx.value!,
            tx.date
        );

        if ("localCredits" in history) {
            history[tx.value! > 0 ? "localCredits" : "localDebits"][bucket] += (remove ? -1 : 1) * tx.value!;
        }
    };

    (ids || state.transaction.ids).forEach((id) => {
        const tx = state.transaction.entities[id]!;

        TransactionSummaries.forEach((summary) => {
            if (tx[summary] === null) return;
            updateHistoryValue(state[summary].entities[tx[summary]]!.transactions, tx);
        });

        const { hierarchy } = state.category.entities[tx.category]!;
        hierarchy.forEach((category) => updateHistoryValue(state.category.entities[category]!.transactions, tx));
    });
};

const updateBalancesAndAccountSummaries = (state: DataState, subset?: BalanceSubset) => {
    fillTransactionBalances(state.transaction, subset);
    updateCurrencyStartDates(state, subset && uniq(subset.map(({ currency }) => currency)));
    updateAccountTransactionDates(state, subset && uniq(subset.map(({ account }) => account)));
    updateBalanceSummaries(state, subset);
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

const updateCurrencyStartDates = (data: DataState, subset?: EntityId[]) => {
    const placeholder = getCurrentMonthString();
    (subset || data.currency.ids).forEach((id) => {
        data.currency.entities[id]!.start = placeholder;
    });

    data.transaction.ids.forEach((id) => {
        const tx = data.transaction.entities[id]!;
        if (subset && !subset.includes(tx.currency)) return;
        const currency = data.currency.entities[tx.currency]!;

        if (!currency.start || currency.start > tx.date)
            currency.start = formatDate(parseDate(tx.date).startOf("month"));
    });
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

const updateCategoryTransactionDates = (data: DataState, subset?: EntityId[]) => {
    (subset || data.category.ids).forEach((id) => {
        data.category.entities[id]!.firstTransactionDate = undefined;
        data.category.entities[id]!.lastTransactionDate = undefined;
    });

    data.transaction.ids.forEach((id) => {
        const tx = data.transaction.entities[id]!;
        if (subset && !subset.includes(tx.category)) return;
        const category = data.category.entities[tx.category]!;

        if (!category.firstTransactionDate || category.firstTransactionDate > tx.date)
            category.firstTransactionDate = tx.date;
        if (!category.lastTransactionDate || category.lastTransactionDate < tx.date)
            category.lastTransactionDate = tx.date;
    });
};

const updateBalanceSummaries = (data: DataState, subset?: BalanceSubset) => {
    // Reset Balances
    (subset || getFullBalanceSubset(data.transaction)).forEach(({ account, currency }) => {
        data.account.entities[account]!.balances[currency] = BaseBalanceValues();
    });

    const userDefaultCurrency = data.currency.entities[data.user.entities[StubUserID]!.currency]!;
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
                changeCurrencyValue(userDefaultCurrency, data.currency.entities[tx.currency]!, tx.balance, tx.date)
            );
            history.original = takeWithDefault(history.original, bucket + 1, tx.balance);
        }
    });
};
