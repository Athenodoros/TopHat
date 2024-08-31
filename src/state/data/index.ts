import { AlertColor } from "@mui/material";
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
import chroma from "chroma-js";
import { WritableDraft } from "immer/dist/internal";
import {
    clone,
    cloneDeep,
    get,
    isEqual,
    keys,
    noop,
    omit,
    orderBy,
    range,
    reverse,
    round,
    toPairs,
    uniq,
    uniqWith,
    upperFirst,
    values,
} from "lodash";
import { DateTime } from "luxon";
import { AnyAction } from "redux";
import { applyPatch, createPatch } from "rfc6902";
import { mapValuesWithKeys, takeWithDefault, updateListSelection } from "../../shared/data";
import { CURRENCY_NOTIFICATION_ID, DROPBOX_NOTIFICATION_ID } from "../logic/notifications/types";
import { useSelector } from "../shared/hooks";
import {
    BaseBalanceValues,
    BaseTransactionHistory,
    BaseTransactionHistoryWithLocalisation,
    formatDate,
    getCurrentMonth,
    getCurrentMonthString,
    getToday,
    getTodayString,
    ID,
    parseDate,
    TransactionHistory,
    TransactionHistoryWithLocalisation,
} from "../shared/values";
import { finishDemoInitialisation } from "./demo/post";
import {
    changeCurrencyValue,
    compareTransactionsDescendingDates,
    DEFAULT_CURRENCY,
    DEFAULT_USER_VALUE,
    PLACEHOLDER_CATEGORY,
    PLACEHOLDER_CATEGORY_ID,
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
    CurrencyExchangeRate,
    DataState,
    PatchGroup,
    Rule,
    Statement,
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
const CategoryAdapter = createEntityAdapter<Category>({
    sortComparer: (left, right) =>
        left.id === PLACEHOLDER_CATEGORY_ID
            ? -1
            : right.id === PLACEHOLDER_CATEGORY_ID
            ? 1
            : left.id === TRANSFER_CATEGORY_ID
            ? -1
            : right.id === TRANSFER_CATEGORY_ID
            ? 1
            : left.name.localeCompare(right.name),
});
const AccountAdapter = createEntityAdapter<Account>({
    sortComparer: (left, right) => left.institution - right.institution || left.id - right.id,
});
const PatchAdapter = createEntityAdapter<PatchGroup>({
    sortComparer: (left, right) => -left.id.localeCompare(right.id),
});

const BaseObjects = {
    category: [PLACEHOLDER_CATEGORY, TRANSFER_CATEGORY],
    currency: [DEFAULT_CURRENCY],
    institution: [PLACEHOLDER_INSTITUTION],
    statement: [PLACEHOLDER_STATEMENT],
};

const adapters: Record<keyof DataState, EntityAdapter<any>> = {
    account: AccountAdapter,
    category: CategoryAdapter,
    currency: NameAdapter,
    institution: NameAdapter,
    rule: IndexedAdapter,
    transaction: DateAdapter,
    statement: BaseAdapter,
    notification: BaseAdapter,
    user: BaseAdapter,
    patches: PatchAdapter,
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
    [Key in keyof DataState]: DataState[Key] extends EntityState<infer T> | undefined ? T[] : never;
};

const initialTutorialState: DataState = {
    ...DataBaseline,
    user: adapters.user.addOne(adapters.user.getInitialState(), { ...DEFAULT_USER_VALUE, tutorial: true }),
};

// Undo notification submitter
type SubmitType = (patch: string, message: string, intent?: AlertColor) => void;
let submitNotification: SubmitType = noop;
let rewindDisplaySpec: { message: string; intent?: AlertColor } | null = null;
export const setSubmitNotification = (newSubmit: SubmitType) => {
    submitNotification = newSubmit;
};

// Create Slice automatically wraps reducer functions with Immer objects to allow mutation
// See docs here: https://redux-toolkit.js.org/usage/immer-reducers
export const DataSlice = createSlice({
    name: "data",
    initialState: initialTutorialState,
    reducers: {
        restartTutorial: () => initialTutorialState,
        reset: () => {
            rewindDisplaySpec = { message: "All data wiped!", intent: "warning" };

            return {
                ...DataBaseline,
                user: adapters.user.addOne(adapters.user.getInitialState(), DEFAULT_USER_VALUE),
            };
        },
        set: (_, { payload }: PayloadAction<DataState>) => payload,
        setFromLists: (_, { payload }: PayloadAction<ListDataState>) =>
            mapValuesWithKeys(adapters, (name, adapter) => adapter.addMany(adapter.getInitialState(), payload[name])),
        setUpDemo: (_, { payload: { demo, download } }: PayloadAction<{ demo: ListDataState; download: string }>) => {
            const state = mapValuesWithKeys(adapters, (name, adapter) =>
                adapter.addMany(cloneDeep(DataBaseline[name]), demo[name])
            ) as DataState;

            rewindDisplaySpec = { message: "Demo data loaded!" };

            // This is necessary because the EntityAdapters freeze objects when they are added
            return createNextState(state, (state) => {
                updateTransactionSummariesWithTransactions(state);
                updateBalancesAndAccountSummaries(state);
                updateCategoryTransactionDates(state);

                finishDemoInitialisation(state, download);
            });
        },

        // Utilities functions for debugging
        refreshCaches,
        removeUnusedStatements: (state) => {
            const included = uniq(state.transaction.ids.map((id) => state.transaction.entities[id]!.statement));
            const excluded = state.statement.ids.filter((id) => !included.includes(id as number));
            adapters.statement.removeMany(state.statement, excluded);
        },
        fitAccountLastUpdateDates: (state) =>
            void adapters.account.updateMany(
                state.account,
                state.account.ids.map((id) => ({
                    id,
                    changes: { lastUpdate: state.account.entities[id]!.lastTransactionDate },
                }))
            ),

        setUserGeneration: (state, { payload: generation }: PayloadAction<number>) =>
            void adapters.user.updateOne(state.user, { id: StubUserID, changes: { generation } }),
        updateTransactionSummaryStartDates: (state) => updateTransactionSummaryStartDates(state),

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
            rewindDisplaySpec = { message: "Account updated!" };
        },
        updateCategoryBudgets: (state, { payload }: PayloadAction<Record<ID, number>>) => {
            keys(payload).forEach((id) => {
                const budget = state.category.entities[Number(id)]!.budgets;
                if (budget) budget.values[0] = payload[Number(id)];
            });
            rewindDisplaySpec = { message: "Category updated!" };
        },
        addNewTransaction: (state, { payload: tx }: PayloadAction<Transaction>) => {
            updateTransactionSummaryStartDates(state);

            // cloneDeep is to get around object freezing in the adapter
            adapters.transaction.addOne(state.transaction, cloneDeep(tx));

            updateTransactionSummariesWithTransactions(state, [tx.id]);
            updateBalancesAndAccountSummaries(state, [{ currency: tx.currency, account: tx.account }]);
            updateCategoryTransactionDates(state, [tx.category]);

            rewindDisplaySpec = { message: "Transaction added!" };
        },
        updateTransactions: (state, { payload }: PayloadAction<Update<Transaction>[]>) => {
            updateTransactions(state, payload);
            rewindDisplaySpec = { message: `Transaction${payload.length === 1 ? "" : "s"} updated!` };
        },
        deleteTransactions: (state, { payload: ids }: PayloadAction<ID[]>) => {
            const balanceSubset = getBalanceSubset(ids, state.transaction.entities);

            updateTransactionSummaryStartDates(state);
            updateTransactionSummariesWithTransactions(state, ids, true);
            adapters.transaction.removeMany(state.transaction, ids);

            updateBalancesAndAccountSummaries(state, balanceSubset);

            rewindDisplaySpec = { message: "Transactions deleted!" };
        },
        updateCurrencyRates: (
            state: WritableDraft<DataState>,
            { payload: currencies }: PayloadAction<{ id: ID; rates: CurrencyExchangeRate[] }[]>
        ) => {
            currencies = currencies.filter(({ id, rates }) => !isEqual(state.currency.entities[id]?.rates, rates));

            if (currencies.length !== 0) {
                // TODO: check whether default currency is included to avoid recalculating everything twice
                currencies.forEach(({ id, rates }) =>
                    updateStateWithCurrency(state, { ...state.currency.entities[id]!, rates })
                );

                rewindDisplaySpec = { message: "Currency rates updated!" };
            }

            adapters.notification.removeOne(state.notification, CURRENCY_NOTIFICATION_ID);
            adapters.user.updateOne(state.user, { id: StubUserID, changes: { lastSyncTime: getTodayString() } });
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
                updateStateWithCurrency(state, working as Currency);
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

            rewindDisplaySpec = { message: upperFirst(type) + " updated!" };
        },
        deleteObject: (state, { payload: { type, id } }: PayloadAction<{ type: BasicObjectName; id: ID }>) => {
            if (deleteObjectError(state, type, id) !== undefined) return;

            if (type === "rule") {
                const { index } = state.rule.entities[id]!;
                adapters.rule.updateMany(
                    state.rule,
                    state.rule.ids
                        .filter((ruleID) => state.rule.entities[ruleID]!.index > index)
                        .map((ruleID) => ({ id: ruleID, changes: { index: state.rule.entities[ruleID]!.index - 1 } }))
                );
            }

            adapters[type].removeOne(state[type], id);

            if (type === "statement") {
                state.transaction.ids.forEach((txID) => {
                    const tx = state.transaction.entities[txID]!;
                    if (tx.statement === id) {
                        tx.statement = PLACEHOLDER_STATEMENT_ID;
                    }
                });
            }

            rewindDisplaySpec = { message: upperFirst(type) + " deleted!" };
        },
        updateUserPartial: (state, { payload }: PayloadAction<Partial<Omit<User, "currency">>>) =>
            void adapters.user.updateOne(state.user, { id: StubUserID, changes: payload }),

        // Workflow actions
        finishStatementImport: (
            state,
            {
                payload: { statements, transactions, transfers = [], account },
            }: PayloadAction<{
                statements: Statement[];
                transactions: Transaction[];
                transfers?: ID[];
                account: Pick<Account, "id" | "statementFilePattern" | "lastStatementFormat">;
            }>
        ) => {
            rewindDisplaySpec = { message: "Uploaded statement" + (statements.length === 1 ? "!" : "s!") };

            // Add Statements
            adapters.statement.addMany(state.statement, statements);

            // Add Transactions
            updateTransactionSummaryStartDates(state);
            updateTransactionSummariesWithTransactions(state, transfers, true);

            adapters.transaction.updateMany(
                state.transaction,
                transfers.map((id) => ({ id, changes: { category: TRANSFER_CATEGORY_ID } }))
            );
            // cloneDeep is to get around object freezing in the adapter
            adapters.transaction.addMany(state.transaction, cloneDeep(transactions));

            const transactionIDs = transactions.map(({ id }) => id);
            updateTransactionSummariesWithTransactions(state, transfers.concat(transactionIDs));
            updateBalancesAndAccountSummaries(state, getBalanceSubset(transactionIDs, state.transaction.entities));
            updateCategoryTransactionDates(
                state,
                uniq(transactionIDs.map((id) => state.transaction.entities[id]!.category))
            );

            // Update Account metadata
            adapters.account.updateOne(state.account, { id: account.id, changes: omit(account, "id") });
        },
        regenerateCategoryColours: (state) => {
            const toplevel = (values(state.category.entities) as Category[]).filter(
                (category) =>
                    category.hierarchy.length === 0 &&
                    category.id !== PLACEHOLDER_CATEGORY_ID &&
                    category.id !== TRANSFER_CATEGORY_ID
            );

            const scale = chroma.scale("set1").domain([0, toplevel.length]);

            adapters.category.updateMany(
                state.category,
                toplevel.map((category, idx) => ({ id: category.id, changes: { colour: scale(idx).hex() } }))
            );

            rewindDisplaySpec = { message: "Categories updated!" };
        },

        setDefaultCurrency: (state, { payload: currency }: PayloadAction<ID>) => {
            wipeTransactionSummaries(state);

            state.user.entities[StubUserID]!.currency = currency;

            updateTransactionSummariesWithTransactions(state);
            updateBalanceSummaries(state); // Transaction balances and account metadata are unchanged
        },

        runRule: (state, { payload: id }: PayloadAction<ID>) => {
            const getTransactionChanges = getGetTransactionChangesForRule(state.rule.entities[id]!);

            const updates: Update<Transaction>[] = [];
            state.transaction.ids.forEach((id) => {
                const changes = getTransactionChanges(state.transaction.entities[id]!);
                if (changes) updates.push({ id, changes });
            });

            updateTransactions(state, updates);

            rewindDisplaySpec = { message: "Run operation complete!" };
        },

        updateRuleIndices: (state, { payload }: PayloadAction<[ID, number][]>) =>
            void adapters.rule.updateMany(
                state.rule,
                payload.map(([id, index]) => ({ id, changes: { index } }))
            ),
        createStatements: (state: DataState, { payload }: PayloadAction<Statement[]>) =>
            void adapters.statement.addMany(state.statement, payload),

        // Notifications
        updateNotificationState: (
            state,
            { payload: { id, contents } }: PayloadAction<{ id: string; contents: string | null }>
        ) => {
            if (contents === null) adapters.notification.removeOne(state.notification, id);
            else adapters.notification.upsertOne(state.notification, { id, contents });
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

        removeDropoxSync: (state) => {
            state.user.entities[StubUserID]!.dropbox = undefined;
            adapters.notification.removeOne(state.notification, DROPBOX_NOTIFICATION_ID);
            rewindDisplaySpec = { message: "Dropbox sync removed!" };
        },

        createInitialPatchState: (state) => {
            state.patches = PatchAdapter.getInitialState();
        },
        rewindToPatch: (state, { payload: target }: PayloadAction<string>) => {
            if (!state.patches?.ids.includes(target)) return;

            rewindDisplaySpec = { message: "Rewound to old version!" };

            for (const patchID of state.patches.ids) {
                const patch = state.patches.entities[patchID]!;
                applyPatch(state, patch.patches);

                if (patchID === target) break;
            }
        },

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

export function refreshCaches(state: WritableDraft<DataState>) {
    values(state.currency.entities).forEach((currency) => {
        currency!.rates = orderBy(currency!.rates, "month", "desc");
    });

    wipeTransactionSummaries(state);

    updateTransactionSummariesWithTransactions(state);
    updateBalancesAndAccountSummaries(state);
    updateCategoryTransactionDates(state);
}

export type DataUpdateListener = (previous: DataState | undefined, next: DataState) => void;
const listeners: DataUpdateListener[] = [];
const oldReducer = DataSlice.reducer; // Separate assignment to prevent infinite recursion
DataSlice.reducer = (state: DataState | undefined, action: AnyAction) => {
    const rawNewState = oldReducer(state, action);

    // Apply patch
    const patch: PatchGroup = {
        id: new Date().toISOString() + Math.random(),
        date: new Date().toISOString(),
        action: rewindDisplaySpec?.message ?? (state ? null : "Initial state"),
        patches: createPatch(rawNewState, state ?? initialTutorialState),
    };
    let patches = rawNewState.patches ? cloneDeep(rawNewState.patches) : PatchAdapter.getInitialState();
    patches = PatchAdapter.removeMany(
        patches,
        patches.ids.filter(
            (id) =>
                DateTime.fromISO(patches.entities[id]!.date).diffNow("days").days >
                (rawNewState.user.entities[StubUserID]!.historyRetentionPeriod ?? 30)
        )
    );
    if (patch.patches.length !== 0) {
        patches = PatchAdapter.addOne(patches, patch);
    }
    const newState = { ...rawNewState, patches };

    // Maybe show notification
    if (rewindDisplaySpec) {
        if (state) submitNotification(patch.id, rewindDisplaySpec.message, rewindDisplaySpec.intent);

        rewindDisplaySpec = null;
    }

    // Call listeners
    if (!isEqual(omit(state, "patches"), omit(newState, "patches"))) {
        return createNextState(newState, (newState) => {
            listeners.forEach((listener) => listener(state, newState));
        });
    }

    return newState;
};
export const subscribeToDataUpdates = (listener: DataUpdateListener) => void listeners.push(listener);

const updateTransactions = (state: DataState, updates: Update<Transaction>[]) => {
    const ids = updates.map(({ id }) => id);

    const oldBalanceSubset = getBalanceSubset(ids, state.transaction.entities);

    updateTransactionSummaryStartDates(state);
    updateTransactionSummariesWithTransactions(state, ids, true);

    adapters.transaction.updateMany(state.transaction, updates);

    const newBalanceSubset = getBalanceSubset(ids, state.transaction.entities);
    updateTransactionSummariesWithTransactions(state, ids);
    updateBalancesAndAccountSummaries(state, uniqWith(oldBalanceSubset.concat(newBalanceSubset), isEqual));
};

const wipeTransactionSummaries = (state: DataState) =>
    TransactionSummaries.forEach((type) => {
        adapters[type].updateMany(
            state[type],
            state[type].ids.map((id) => ({
                id,
                changes: {
                    transactions:
                        type === "currency" ? BaseTransactionHistoryWithLocalisation() : BaseTransactionHistory(),
                },
            }))
        );
    });

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

        if (bucket >= history.original.length)
            history.original = takeWithDefault(history.original, bucket + 1, tx.balance);
    });

    if (!subset)
        subset = data.account.ids.flatMap((account) =>
            keys(data.account.entities[account]!.balances).map((currency) => ({
                account: account as ID,
                currency: Number(currency),
            }))
        );

    subset.forEach(({ account, currency }) => {
        const { balances } = data.account.entities[account]!;

        // Calculate localised balances
        balances[currency].localised = balances[currency].original.map((value, idx) =>
            changeCurrencyValue(
                userDefaultCurrency,
                data.currency.entities[currency]!,
                value,
                formatDate(getToday().endOf("month").minus({ months: idx }))
            )
        );

        // Clean up empty balances
        if (!balances[currency].localised.some((x) => x)) delete balances[currency];
    });
};

const getTestRegex = (regexes: string[]) => {
    const master = new RegExp(regexes.join("|"));
    return (value: string) => value.match(master) !== null;
};
export const getGetTransactionChangesForRule = (rule: Rule) => {
    const testTextField = (tests: string[], regex: boolean, value: string | undefined) => {
        if (tests.length === 0) return true;
        if (regex) return getTestRegex(tests)(value ?? "");
        if (!value) return false;
        return tests.some((option) => value.includes(option));
    };

    return (transaction: Transaction) => {
        if (
            (!rule.accounts.length || rule.accounts.includes(transaction.account)) &&
            (rule.min === null || rule.min <= transaction.value!) &&
            (rule.max === null || rule.max >= transaction.value!) &&
            testTextField(rule.reference, rule.regex, transaction.reference) &&
            testTextField(rule.longReference ?? [], rule.longReferenceRegex ?? false, transaction.longReference)
        ) {
            const changes: Partial<Transaction> = {};
            if (rule.summary !== undefined) changes.summary = rule.summary;
            if (rule.description !== undefined) changes.description = rule.description;
            if (rule.category !== PLACEHOLDER_CATEGORY_ID) changes.category = rule.category;
            return changes;
        }
    };
};

export const updateStateWithCurrency = (state: WritableDraft<DataState>, working: Currency) => {
    // Update local values if exchange rate changes
    const isDefaultCurrency = state.user.entities[StubUserID]?.currency === working.id;
    const transactionSubset = isDefaultCurrency
        ? undefined
        : state.transaction.ids.filter((id) => state.transaction.entities[id]!.currency === working.id);

    updateTransactionSummariesWithTransactions(state, transactionSubset, true);

    // Don't overwrite transaction summary with old version
    const draft = cloneDeep(working as Currency);
    draft.transactions = state.currency.entities[working.id]!.transactions;
    adapters.currency.upsertOne(state.currency, draft);

    updateTransactionSummariesWithTransactions(state, transactionSubset);
    updateBalancesAndAccountSummaries(
        state,
        transactionSubset && getBalanceSubset(transactionSubset, state.transaction.entities)
    );
};
