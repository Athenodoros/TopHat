/**
 * Test-only access to the two places TopHat's data lives in the browser, along with a small set of
 * saved data to run tests against.
 *
 * There are two of them because of the move off Dexie. The store is where data is saved today: one
 * compressed row, written by personal-storage-wrapper. The database is the one the Dexie version
 * wrote, one table per entity type, which is still read on the first boot after the upgrade and is
 * how a legacy install is set up in these tests.
 *
 * Both are written against the raw IndexedDB API rather than through the library that writes them,
 * so that they describe what is actually left in the browser rather than what one particular
 * library makes of it. That way they outlive the storage layer they were written for.
 */

// The in-memory implementation has to be installed before a test file pulls in any of the app
import "fake-indexeddb/auto";

import { gunzipSync, gzipSync } from "node:zlib";
import { sortBy } from "lodash-es";
import type { ListDataState } from "../../data";
import type {
    Account,
    Category,
    Currency,
    Institution,
    Notification,
    PatchGroup,
    Rule,
    Statement,
    Transaction,
    User,
} from "../../data/types";
import { getCurrentMonth, getCurrentMonthString, getTodayString, parseDate, SDate, STime } from "../../shared/values";

/**
 * The legacy Dexie schema
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

export const deleteLegacyDatabase = () =>
    new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(DATABASE_NAME);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error("Blocked deleting " + DATABASE_NAME + " by an open connection"));
    });

/** Whether a database is there at all, without creating one by asking */
export const legacyDatabaseExists = async () => {
    const databases = await indexedDB.databases();
    return databases.some(({ name }) => name === DATABASE_NAME);
};

/**
 * The store
 *
 * One row of gzipped JSON, under a fixed key so that it is findable whatever else has been lost.
 */
export const STORE_DATABASE_NAME = "personal-storage-wrapper";
export const STORE_TABLE_NAME = "stores";
export const STORE_KEY = "tophat";
export const SYNC_CONFIG_KEY = "tophat-syncs";
export const MIGRATION_RECORD_KEY = "tophat-legacy-migration";

const openStore = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(STORE_DATABASE_NAME, 1);

        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(STORE_TABLE_NAME))
                request.result.createObjectStore(STORE_TABLE_NAME, { keyPath: "id" });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error("Blocked opening " + STORE_DATABASE_NAME));
    });

/** What TopHat has saved, or null when it has saved nothing */
export const readFromStore = async (): Promise<ListDataState | null> => {
    const db = await openStore();

    const row = await runTransaction(db, [STORE_TABLE_NAME], "readonly", (tx) =>
        tx.objectStore(STORE_TABLE_NAME).get(STORE_KEY)
    );
    db.close();

    const stored = row.result as { buffer: ArrayBuffer } | undefined;
    if (!stored) return null;

    return sortLists(JSON.parse(gunzipSync(Buffer.from(stored.buffer)).toString()) as Partial<ListDataState>);
};

/** Data left behind by a previous session, written before any app code has run */
export const writeToStore = async (data: Partial<ListDataState>, timestamp: Date = new Date()) => {
    const db = await openStore();

    const buffer = new Uint8Array(gzipSync(Buffer.from(JSON.stringify(sortLists(data))))).buffer;
    await runTransaction(db, [STORE_TABLE_NAME], "readwrite", (tx) =>
        tx.objectStore(STORE_TABLE_NAME).put({ id: STORE_KEY, buffer, timestamp })
    );
    db.close();
};

/**
 * Emptied rather than deleted, because a boot leaves its connection to the store open the way an
 * open tab would, and a delete would sit blocked behind it.
 */
export const clearStore = async () => {
    const db = await openStore();
    await runTransaction(db, [STORE_TABLE_NAME], "readwrite", (tx) => tx.objectStore(STORE_TABLE_NAME).clear());
    db.close();

    localStorage.clear();
};

/**
 * The record of when the legacy database was copied across, which decides when it can be deleted
 */
export interface MigrationRecord {
    migratedAt: string;
    boots: number;
}

export const getMigrationRecord = (): MigrationRecord | null => {
    const stored = localStorage.getItem(MIGRATION_RECORD_KEY);
    return stored ? (JSON.parse(stored) as MigrationRecord) : null;
};

export const setMigrationRecord = (record: MigrationRecord | null) =>
    record === null
        ? localStorage.removeItem(MIGRATION_RECORD_KEY)
        : localStorage.setItem(MIGRATION_RECORD_KEY, JSON.stringify(record));

export const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

/**
 * Timing
 */
/** Months between a fixture's hard-coded month and this one, which is how far caches roll forward */
export const getMonthsSince = (month: SDate) => getCurrentMonth().diff(parseDate(month), "months").months;

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

/**
 * Saved data from an old session
 *
 * Every date here is written out rather than taken from the clock, so this is what a session from
 * some months ago left behind: caches that have to be rolled forward on load, and everything else,
 * which has to survive that untouched. It also fills in the fields that a new install never has -
 * statement formats, budgets, currency syncs, rules, patches, a Dropbox token - because those are
 * the ones a rewrite of the storage layer can quietly drop without any test noticing.
 */
export const OldMonth = "2021-03-01" as SDate;
const OldDay = "2021-03-17" as SDate;
const EarlierDay = "2021-02-26" as SDate;
const OldTime = "2021-03-17T09:12:44.000+11:00" as STime;

export const OldInstitution: Institution = {
    id: 1,
    name: "Bank of Elsewhere",
    colour: "#1976d2",
    icon: "data:image/png;base64,iVBORw0KGgo=",
};

export const OldAccount: Account = {
    id: 1,
    name: "Everyday Account",
    website: "https://bank.example",
    isInactive: false,
    category: 1,
    institution: 1,
    openDate: "2019-11-04" as SDate,
    firstTransactionDate: EarlierDay,
    lastTransactionDate: OldDay,
    lastUpdate: OldDay,
    balances: { 1: { start: OldMonth, original: [1234.5, 1000], localised: [1234.5, 1000] } },
    transactions: { start: OldMonth, credits: [0, 4000], debits: [32.5, 0], count: 2 },
    lastStatementFilePatternReset: OldTime,
    statementFilePattern: "everyday-(\\d+).csv",
    statementFilePatternManual: "everyday-2021-03.csv",
    lastStatementFormat: {
        parse: { header: true, delimiter: ",", dateFormat: "dd/MM/yyyy" },
        columns: [
            { id: "col-1", name: "Date", type: "date", nullable: false },
            { id: "col-2", name: "Description", type: "string", nullable: false },
            { id: "col-3", name: "Amount", type: "number", nullable: true },
        ],
        mapping: {
            date: "col-1",
            reference: "col-2",
            longReference: "col-2",
            value: { type: "value", value: "col-3", flip: false },
            currency: { type: "constant", currency: 1 },
        },
        date: OldDay,
        reverse: true,
    },
};

export const OldHousehold: Category = {
    id: 1,
    name: "Household",
    colour: "#00897b",
    hierarchy: [],
    firstTransactionDate: OldDay,
    lastTransactionDate: OldDay,
    transactions: { start: OldMonth, credits: [], debits: [32.5, 0], count: 1 },
};
export const OldGroceries: Category = {
    id: 2,
    name: "Groceries",
    colour: "#26a69a",
    hierarchy: [1],
    firstTransactionDate: OldDay,
    lastTransactionDate: OldDay,
    transactions: { start: OldMonth, credits: [], debits: [32.5, 0], count: 1 },
    budgets: { start: OldMonth, strategy: "rollover", base: -400, values: new Array(24).fill(-400) },
};
export const OldIncome: Category = {
    id: 3,
    name: "Income",
    colour: "#43a047",
    hierarchy: [],
    firstTransactionDate: EarlierDay,
    lastTransactionDate: EarlierDay,
    transactions: { start: OldMonth, credits: [0, 4000], debits: [], count: 1 },
};

export const OldCurrency: Currency = {
    id: 1,
    ticker: "AUD",
    name: "Australian Dollars",
    symbol: "AU$",
    colour: "#7157D9",
    start: "2021-02-01" as SDate,
    rates: [
        { month: OldMonth, value: 0.78 },
        { month: "2021-02-01" as SDate, value: 0.76 },
    ],
    sync: { type: "currency", ticker: "AUD" },
    transactions: {
        start: OldMonth,
        credits: [0, 4000],
        debits: [32.5, 0],
        count: 2,
        localCredits: [0, 4000],
        localDebits: [32.5, 0],
    },
};

export const OldRule: Rule = {
    id: 1,
    name: "Supermarkets",
    index: 1,
    isInactive: false,
    reference: ["WOOLWORTHS", "COLES"],
    regex: false,
    longReference: ["WOOLWORTHS \\d+"],
    longReferenceRegex: true,
    min: -500,
    max: null,
    accounts: [1],
    summary: "Supermarket",
    description: "Matched by the supermarkets rule",
    category: 2,
};

export const OldStatement: Statement = {
    id: 1,
    name: "everyday-2021-03.csv",
    account: 1,
    date: OldDay,
    contents: "Date,Description,Amount\n17/03/2021,WOOLWORTHS 1234,-32.50\n",
};

export const OldGroceriesTransaction: Transaction = {
    id: 1,
    date: OldDay,
    reference: "WOOLWORTHS",
    longReference: "WOOLWORTHS 1234 SYDNEY AU",
    summary: "Supermarket",
    description: "Matched by the supermarkets rule",
    value: -32.5,
    recordedBalance: 1234.5,
    balance: 1234.5,
    account: 1,
    category: 2,
    currency: 1,
    statement: 1,
};
export const OldSalaryTransaction: Transaction = {
    id: 2,
    date: EarlierDay,
    reference: "SALARY",
    longReference: "SALARY PAYMENT EMPLOYER PTY LTD",
    summary: null,
    description: null,
    value: 4000,
    recordedBalance: null,
    balance: 1267,
    account: 1,
    category: 3,
    currency: 1,
    statement: 0,
};

/**
 * The milestone matches the balance above, and the account is already marked as out of date, so
 * that loading this data does not set off any of the notification rules
 */
export const OldUser: User = {
    id: 0,
    generation: 5,
    currency: 1,
    isDemo: false,
    tutorial: false,
    start: "2019-11-04" as SDate,
    alphavantage: "demo",
    lastSyncTime: OldDay,
    dropbox: { refreshToken: "old-refresh-token", name: "A User", email: "user@example.com" },
    disabled: ["debt-level"],
    milestone: 1200,
    debt: 0,
    accountOutOfDate: [1],
    uncategorisedTransactionsAlerted: false,
};

export const OldNotification: Notification = { id: "dropbox-sync-broken", contents: "" };

export const OldPatch: PatchGroup = {
    id: "old-patch",
    date: OldTime,
    action: "Transaction updated",
    patches: [{ op: "replace", path: "/transaction/entities/1/value", value: -32.5 }],
    reverted: false,
};

export const OldSavedData: ListDataState = {
    account: [OldAccount],
    category: [NoCategory, Transfer, OldHousehold, OldGroceries, OldIncome],
    currency: [OldCurrency],
    institution: [NoInstitution, OldInstitution],
    rule: [OldRule],
    transaction: [OldGroceriesTransaction, OldSalaryTransaction],
    statement: [{ ...NoStatement, date: OldDay }, OldStatement],
    user: [OldUser],
    notification: [OldNotification],
    patches: [OldPatch],
};
