/**
 * Test-only access to the IndexedDB database that TopHat persists into, along with a small set of
 * saved data to run tests against.
 *
 * These utilities are written against the raw IndexedDB API rather than Dexie, so that they
 * describe what is actually left in the browser rather than what one particular library makes of
 * it. That way they can outlive the current storage layer: when `database.ts` is rewritten, these
 * are the tests that say whether existing users' data still loads.
 */

// Dexie reads `indexedDB` off the global when it is first imported, so the in-memory implementation
// has to be installed before a test file pulls in any of the app
import "fake-indexeddb/auto";

import { sortBy } from "lodash-es";
import type { ListDataState } from "../../data";
import type { Account, Category, Currency, Institution, Statement, Transaction, User } from "../../data/types";
import { getCurrentMonthString, getTodayString } from "../../shared/values";

/**
 * Schema
 */
export const DATABASE_NAME = "TopHatDatabase";

type DataKey = keyof ListDataState;

// "transaction" is stored as "transaction_", because Dexie has a method of its own by that name
const StoreNames: Record<DataKey, string> = {
    account: "account",
    category: "category",
    currency: "currency",
    institution: "institution",
    rule: "rule",
    transaction: "transaction_",
    statement: "statement",
    user: "user",
    notification: "notification",
    patches: "patches",
};
export const DataKeys = Object.keys(StoreNames) as DataKey[];

interface StoreSchema {
    name: string;
    keyPath: string;
    autoIncrement?: boolean;
    indexes?: { name: string; unique?: boolean }[];
}
export interface DatabaseSchema {
    version: number;
    stores: StoreSchema[];
}

const getDataStores = (keys: DataKey[]): StoreSchema[] =>
    keys.map((key) => ({
        name: StoreNames[key],
        keyPath: "id",
        indexes: key === "transaction" ? [{ name: "statement" }] : [],
    }));

// dexie-observable keeps its own bookkeeping tables in the same database: `_changes` is the log of
// writes that tabs read each other's updates out of, and the rest track the tabs themselves
const ObservableStores: StoreSchema[] = [
    { name: "_changes", keyPath: "rev", autoIncrement: true },
    { name: "_intercomm", keyPath: "id", autoIncrement: true, indexes: [{ name: "destinationNode" }] },
    {
        name: "_syncNodes",
        keyPath: "id",
        autoIncrement: true,
        indexes: [
            { name: "isMaster" },
            { name: "lastHeartBeat" },
            { name: "myRevision" },
            { name: "status" },
            { name: "type" },
            { name: "url", unique: true },
        ],
    },
    { name: "_uncommittedChanges", keyPath: "id", autoIncrement: true, indexes: [{ name: "node" }] },
];

/** The schema as it stands today. Dexie multiplies its own version number by ten for IndexedDB. */
export const CurrentSchema: DatabaseSchema = {
    version: 20,
    stores: getDataStores(DataKeys).concat(ObservableStores),
};

/** Dexie schema version one, which predates the `patches` table added for the rewind feature */
export const SchemaBeforePatches: DatabaseSchema = {
    version: 10,
    stores: getDataStores(DataKeys.filter((key) => key !== "patches")).concat(ObservableStores),
};

/**
 * Reading and writing
 */
const runTransaction = <T>(
    db: IDBDatabase,
    stores: string[],
    mode: IDBTransactionMode,
    run: (tx: IDBTransaction) => T
) =>
    new Promise<T>((resolve, reject) => {
        const tx = db.transaction(stores, mode);
        const result = run(tx);
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });

const openDatabase = (schema?: DatabaseSchema) =>
    new Promise<IDBDatabase>((resolve, reject) => {
        const request = schema ? indexedDB.open(DATABASE_NAME, schema.version) : indexedDB.open(DATABASE_NAME);

        request.onupgradeneeded = () =>
            (schema?.stores ?? []).forEach(({ name, keyPath, autoIncrement, indexes }) => {
                if (request.result.objectStoreNames.contains(name)) return;

                const store = request.result.createObjectStore(name, { keyPath, autoIncrement });
                (indexes ?? []).forEach(({ name, unique }) => store.createIndex(name, name, { unique }));
            });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error("Blocked opening " + DATABASE_NAME + " by an older connection"));
    });

const sortByID = <T extends { id: unknown }>(rows: T[]) => sortBy(rows, ({ id }) => "" + id);

/** Lists of objects in a stable order, so that fixtures, Redux and the database can be compared */
export const sortLists = (data: Partial<ListDataState>) =>
    Object.fromEntries(
        DataKeys.map((key) => [key, sortByID((data[key] ?? []) as { id: unknown }[])])
    ) as unknown as ListDataState;

const getStoresWithRows = (db: IDBDatabase, data: Partial<ListDataState>) =>
    DataKeys.filter((key) => data[key]?.length && db.objectStoreNames.contains(StoreNames[key]));

/** Everything saved in the database, as sorted lists. Missing tables and databases read as empty. */
export const readFromDatabase = async (): Promise<ListDataState> => {
    const db = await openDatabase();
    const keys = DataKeys.filter((key) => db.objectStoreNames.contains(StoreNames[key]));

    const results = keys.length
        ? await runTransaction(
              db,
              keys.map((key) => StoreNames[key]),
              "readonly",
              (tx) => keys.map((key) => tx.objectStore(StoreNames[key]).getAll())
          )
        : [];
    db.close();

    const values: Record<string, unknown[]> = {};
    keys.forEach((key, index) => (values[key] = results[index].result));
    return sortLists(values as Partial<ListDataState>);
};

/** Data left behind by a previous session, written before any app code has run */
export const writeToDatabase = async (data: Partial<ListDataState>, schema: DatabaseSchema = CurrentSchema) => {
    const db = await openDatabase(schema);
    const keys = getStoresWithRows(db, data);

    if (keys.length)
        await runTransaction(
            db,
            keys.map((key) => StoreNames[key]),
            "readwrite",
            (tx) => keys.forEach((key) => data[key]!.forEach((row) => tx.objectStore(StoreNames[key]).put(row)))
        );
    db.close();
};

export const deleteDatabase = () =>
    new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(DATABASE_NAME);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error("Blocked deleting " + DATABASE_NAME + " by an open connection"));
    });

/**
 * Another tab
 */
const ANOTHER_TAB = "another-tab";
const CHANGE_TYPE_UPDATE = 2;

/**
 * Writes rows the way a second tab would: the rows themselves, plus an entry in the change log that
 * other tabs read, plus the localStorage write that wakes them up to read it. The change log entries
 * are whole-object updates - a running tab reloads everything on any change from a source other than
 * itself, so it never looks at the contents.
 */
export const updateFromAnotherTab = async (data: Partial<ListDataState>) => {
    const db = await openDatabase();
    const keys = getStoresWithRows(db, data);

    const changes = await runTransaction(db, keys.map((key) => StoreNames[key]).concat("_changes"), "readwrite", (tx) =>
        keys.flatMap((key) =>
            data[key]!.map((row) => {
                tx.objectStore(StoreNames[key]).put(row);
                return tx.objectStore("_changes").add({
                    source: ANOTHER_TAB,
                    type: CHANGE_TYPE_UPDATE,
                    table: StoreNames[key],
                    key: (row as { id: unknown }).id,
                    mods: row,
                });
            })
        )
    );
    db.close();

    const revision = Math.max(...changes.map(({ result }) => Number(result)));
    const key = "Dexie.Observable/latestRevision/" + DATABASE_NAME;
    localStorage.setItem(key, "" + revision);
    window.dispatchEvent(new StorageEvent("storage", { key, newValue: "" + revision }));

    return revision;
};

/**
 * Timing
 */
export const pause = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

/** Saves are fired from a `setTimeout` and never awaited, so tests poll for them */
export const waitFor = async <T>(assertion: () => T | Promise<T>, timeout: number = 2000): Promise<T> => {
    const deadline = Date.now() + timeout;
    for (;;) {
        try {
            return await assertion();
        } catch (error) {
            if (Date.now() > deadline) throw error;
            await pause(10);
        }
    }
};

/**
 * Saved data
 *
 * Hand-written rather than taken from the demo data, so that every value in an assertion can be
 * traced back to something visible here. This is the smallest database that still has a transaction
 * joined up to an account, a category, a currency and a statement. The summary caches TopHat keeps
 * alongside the transactions are left empty, so that a rebuild of them is visible.
 */
const TODAY = getTodayString();
const MONTH = getCurrentMonthString();

const EmptyHistory = { start: MONTH, credits: [], debits: [], count: 0 };
const AUD: Currency = {
    id: 1,
    ticker: "AUD",
    name: "Australian Dollars",
    symbol: "AU$",
    colour: "#7157D9",
    start: MONTH,
    rates: [{ month: MONTH, value: 1 }],
    transactions: { ...EmptyHistory, localCredits: [], localDebits: [] },
};
const NoInstitution: Institution = { id: 0, name: "No Institution", colour: "#757575" };
const NoCategory: Category = {
    id: 0,
    name: "No Category",
    colour: "#9e9e9e",
    hierarchy: [],
    transactions: EmptyHistory,
};
const Transfer: Category = { id: -1, name: "Transfer", colour: "#9e9e9e", hierarchy: [], transactions: EmptyHistory };
const Groceries: Category = { id: 1, name: "Groceries", colour: "#00897b", hierarchy: [], transactions: EmptyHistory };
const NoStatement: Statement = { id: 0, name: "No Statement", contents: "", date: TODAY, account: -1 };
const ChequeAccount: Account = {
    id: 1,
    name: "Cheque Account",
    isInactive: false,
    category: 1,
    institution: 0,
    openDate: TODAY,
    lastUpdate: TODAY,
    balances: {},
    transactions: EmptyHistory,
};
export const Coffee: Transaction = {
    id: 1,
    date: TODAY,
    reference: "COFFEE",
    summary: null,
    description: null,
    value: -10,
    recordedBalance: null,
    balance: -10,
    account: 1,
    category: 1,
    currency: 1,
    statement: 0,
};
const SavedUser: User = {
    id: 0,
    generation: 5,
    currency: 1,
    isDemo: false,
    tutorial: false,
    start: TODAY,
    alphavantage: "demo",
    disabled: [],
    milestone: 0,
    debt: 0,
    accountOutOfDate: [],
    uncategorisedTransactionsAlerted: false,
};

export const getSavedData = (user: Partial<User> = {}): ListDataState => ({
    account: [ChequeAccount],
    category: [NoCategory, Transfer, Groceries],
    currency: [AUD],
    institution: [NoInstitution],
    rule: [],
    transaction: [Coffee],
    statement: [NoStatement],
    user: [{ ...SavedUser, ...user }],
    notification: [],
    patches: [],
});
