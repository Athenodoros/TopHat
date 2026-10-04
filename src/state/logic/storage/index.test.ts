/**
 * Tests for loading and saving TopHat's data: what a boot makes of whatever is already in the
 * browser, and what ends up back in it as the user changes things. They run against the real
 * storage layer, because the thing worth pinning down is the contract with the data that is already
 * sitting in the browsers of people using the app - both in the store the app saves into now, and in
 * the database the Dexie version of the app left behind.
 *
 * @vitest-environment jsdom
 */

// The in-memory implementation has to be installed before anything opens a database
import "fake-indexeddb/auto";

import { omit, sum } from "lodash-es";
import { afterAll, afterEach, describe, expect, test, vi } from "vitest";
import { toListDataState, type DataState } from "../../data";
import { getCurrentMonth, getCurrentMonthString, parseDate, SDate, TransactionHistory } from "../../shared/values";
import {
    closeTestBroadcastChannels,
    deleteStore,
    installTestBroadcastChannel,
    readFromStore,
    readRawFromStore,
    STORE_ID,
    writeRawToStore,
    writeToStore,
} from "./fixtures.testing";
import {
    deleteLegacyDatabase,
    LEGACY_DATABASE_NAME,
    LEGACY_LOCKED_VERSION,
    MIGRATION_RECORD_KEY,
    MigrationRecord,
    RETENTION_BOOTS,
    RETENTION_DAYS,
} from "./legacy";
import {
    Coffee,
    getSavedData,
    LegacySchemaBeforePatches,
    OldAccount,
    OldCurrency,
    OldGroceries,
    OldGroceriesTransaction,
    OldHousehold,
    OldIncome,
    OldInstitution,
    OldMonth,
    OldNotification,
    OldPatch,
    OldRule,
    OldSalaryTransaction,
    OldSavedData,
    OldStatement,
    OldUser,
    readFromLegacyDatabase,
    sortLists,
    writeToLegacyDatabase,
} from "./legacy/fixtures.testing";
import { maybeSaveDataToDropbox } from "../dropbox";
import { CURRENT_GENERATION } from "./migrations";

// A boot also kicks off currency and Dropbox syncs, neither of which is part of what is tested here.
// A test can hold the currency sync up, to keep a boot that loads demo data from finishing.
const currencySync = vi.hoisted(() => ({ hold: null as Promise<void> | null }));
vi.mock("../currencies", () => ({ updateSyncedCurrencies: vi.fn(async () => currencySync.hold ?? undefined) }));
vi.mock("../dropbox", () => ({
    dealWithDropboxRedirect: vi.fn(),
    maybeSaveDataToDropbox: vi.fn(async () => undefined),
}));

// Two boots in this file talk to each other the way two tabs would
installTestBroadcastChannel();
afterAll(() => {
    vi.unstubAllGlobals();
});

// The app's module graph takes half a minute to load the first time, and a fraction of a second on
// each boot after that. Do it here, at collection time, where the per-test timeout does not apply.
await Promise.all([import("../.."), import("../../data"), import("../startup")]);

/**
 * A fresh page load: a new module registry, and so a new store, manager and listeners. Resolves once
 * the modules are loaded, with the tab and a promise of its boot finishing, for tests that act mid-boot.
 */
const startBootingTopHat = async (maybeDropboxCode?: string) => {
    vi.resetModules();

    const [{ TopHatStore, TopHatDispatch }, { DataSlice }, { initialiseAndGetDBConnection }] = await Promise.all([
        import("../.."),
        import("../../data"),
        import("../startup"),
    ]);

    const tab = {
        dispatch: TopHatDispatch,
        actions: DataSlice.actions,
        data: () => TopHatStore.getState().data,
        storage: () => TopHatStore.getState().app.storage,
    };
    return { tab, booted: initialiseAndGetDBConnection(maybeDropboxCode).then(() => tab) };
};

const bootTopHat = async () => (await startBootingTopHat()).booted;

/** Redux state as sorted lists, so that it can be compared against either store or the fixtures */
const asLists = (data: DataState) => sortLists(toListDataState(data));

/** What is in the store, as sorted lists */
const readSortedFromStore = async () => {
    const value = await readFromStore();
    return value && sortLists(value);
};

/** Months between a fixture's hard-coded month and this one, which is how far caches roll forward */
const getMonthsSince = (month: SDate) => getCurrentMonth().diff(parseDate(month), "months").months;

const pause = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * Saves are fired from a `setTimeout` and never awaited, so tests poll for them. Attempts are counted
 * rather than timed, because some tests move the clock.
 */
const waitFor = async <T>(assertion: () => T | Promise<T>, attempts: number = 200): Promise<T> => {
    for (let attempt = 1; ; attempt++) {
        try {
            return await assertion();
        } catch (error) {
            if (attempt >= attempts) throw error;
            await pause(10);
        }
    }
};

/** A manager only takes a value from another tab if it is newer than its own, so tabs that write move the clock */
const moveClockForward = () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 1000);
};

/** The version of the old database, or null if there is none, found without creating one */
const getLegacyDatabaseVersion = async () => {
    const databases = await indexedDB.databases();
    return databases.find(({ name }) => name === LEGACY_DATABASE_NAME)?.version ?? null;
};

const readMigrationRecord = (): MigrationRecord | null => {
    const stored = localStorage.getItem(MIGRATION_RECORD_KEY);
    return stored ? (JSON.parse(stored) as MigrationRecord) : null;
};

const countRows = (data: object) => sum(Object.values(data).map(({ length }) => length));

/** Where the library keeps a manager's list of targets, by default: under its own id */
const SYNC_CONFIG_KEY = "personal-storage-manager-state-" + STORE_ID;

// A boot leaves its manager open, the way an open tab would. Closing the channels stops one test's
// tabs hearing the next's, and deleting the store closes their connections to it.
afterEach(async () => {
    await pause(25); // Saves are fired from a timeout, so let any last one land before wiping
    vi.useRealTimers();
    closeTestBroadcastChannels();
    await deleteLegacyDatabase();
    await deleteStore();
    localStorage.clear();
});

describe("Loading and saving", () => {
    test("starts in the tutorial state when nothing is saved, and saves that alone", async () => {
        const { data, storage } = await bootTopHat();

        expect(storage()).toEqual({ type: "empty" });

        expect(data().user.entities[0]!.tutorial).toBe(true);
        expect(data().account.ids).toEqual([]);
        expect(data().transaction.ids).toEqual([]);

        // The tutorial state is not empty - it holds the placeholder objects that the UI needs
        expect(data().category.ids).toEqual([0, -1]);
        expect(data().institution.ids).toEqual([0]);
        expect(data().currency.entities[1]!.ticker).toBe("AUD");

        // It goes into the store, but nothing creates a database for the old version of the app
        await waitFor(async () => expect(await readSortedFromStore()).toEqual(asLists(data())));
        expect(await getLegacyDatabaseVersion()).toBeNull();
    });

    test("saves the whole state when anything changes", async () => {
        const { data, dispatch, actions } = await bootTopHat();

        dispatch(actions.updateUserPartial({ tutorial: false }));

        await waitFor(async () => expect((await readFromStore())!.user[0].tutorial).toBe(false));
        expect(await readSortedFromStore()).toEqual(asLists(data()));
    });

    test("loads saved data", async () => {
        await writeToStore(getSavedData());

        const { data, storage } = await bootTopHat();

        expect(storage()).toEqual({ type: "loaded" });
        expect(data().user.entities[0]!.tutorial).toBe(false);
        expect(asLists(data())).toEqual(sortLists(getSavedData()));
    });

    test("loads data saved before a list was added, with that list empty", async () => {
        // As data saved by this version will look to one that adds a list of its own
        await writeToStore(omit(getSavedData(), "statement"));

        const { data, storage } = await bootTopHat();

        expect(storage()).toEqual({ type: "loaded" });
        expect(asLists(data())).toEqual(sortLists({ ...getSavedData(), statement: [] }));
    });

    test("saves changes, and loads them again on the next boot", async () => {
        await writeToStore(getSavedData());

        const first = await bootTopHat();
        first.dispatch(first.actions.updateTransactions([{ id: 1, changes: { reference: "TEA", value: -4 } }]));
        first.dispatch(first.actions.addNewTransaction({ ...Coffee, id: 2, reference: "BOOKS" }));
        await waitFor(async () => expect(await readSortedFromStore()).toEqual(asLists(first.data())));

        const second = await bootTopHat();

        expect(second.data().transaction.entities[1]!.reference).toBe("TEA");
        expect(second.data().transaction.entities[2]!.reference).toBe("BOOKS");
        expect(asLists(second.data())).toEqual(asLists(first.data()));
    });

    test("saves a deletion that is the first change of a session", async () => {
        await writeToStore(getSavedData());

        const { data, dispatch, actions } = await bootTopHat();
        dispatch(actions.deleteTransactions([1]));

        await waitFor(async () => expect(await readSortedFromStore()).toEqual(asLists(data())));

        const second = await bootTopHat();
        expect(second.data().transaction.ids).toEqual([]);
    });

    test("migrates data saved by an older version of the app, and saves it without waiting for a change", async () => {
        // Generation three predates both the cache fixes and the patches added for the rewind feature
        await writeToStore(getSavedData({ generation: 3 }));

        const { data } = await bootTopHat();

        expect(data().user.entities[0]!.generation).toBe(5);
        expect(data().patches.ids.length).toBeGreaterThan(0);

        // The summary caches were rebuilt from the transactions, rather than the empty ones loaded
        expect(data().account.entities[1]!.transactions.count).toBe(1);
        expect(data().account.entities[1]!.balances[1].original[0]).toBe(-10);
        expect(data().category.entities[1]!.transactions.count).toBe(1);
        expect(data().currency.entities[1]!.transactions.count).toBe(1);

        expect((await readFromStore())!.user[0].generation).toBe(5);
        await waitFor(async () => expect(await readSortedFromStore()).toEqual(asLists(data())));
    });

    test("warns that nothing can be saved as soon as it boots, when IndexedDB can't be used", async () => {
        // As in some private browsing modes
        const open = vi.spyOn(indexedDB, "open").mockImplementation(() => {
            throw new DOMException("The operation is insecure.", "SecurityError");
        });

        try {
            const { data, dispatch, actions, storage } = await bootTopHat();
            const { IDB_NOTIFICATION_ID } = await import("../notifications/types");
            const { getNotificationDisplayMetadata } = await import("../notifications");

            expect(storage()).toEqual({ type: "unavailable", error: expect.any(String) });

            // Without the user having changed anything
            const notification = data().notification.entities[IDB_NOTIFICATION_ID]!;
            expect(notification).toBeDefined();

            // It has no dismiss button, and deleting it some other way only brings it back
            expect(getNotificationDisplayMetadata(notification).dismiss).toBeUndefined();
            dispatch(actions.deleteNotification(IDB_NOTIFICATION_ID));
            expect(data().notification.entities[IDB_NOTIFICATION_ID]).toBeDefined();
        } finally {
            open.mockRestore();
        }
    });

    test("shows an error page, rather than loading forever, when boot fails before storage is set up", async () => {
        vi.doMock("./index", () => ({
            setupStorageAndLoadData: vi.fn(async () => {
                throw new Error("Something broke");
            }),
        }));
        const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

        try {
            const { storage } = await bootTopHat();

            expect(storage()).toEqual({ type: "failed", error: "Something broke" });
            expect(log).toHaveBeenCalled();
        } finally {
            vi.doUnmock("./index");
            log.mockRestore();
        }
    });
});

describe("Data that can't be used", () => {
    /**
     * Boots on whatever the test has saved, and checks the app is on the recovery screen, and that
     * neither store changes even when the user tries to change something.
     */
    const expectRecoveryWithoutWrites = async (rescuedRows: number) => {
        const before = await readRawFromStore();
        const legacy = await readFromLegacyDatabase();

        const { data, dispatch, actions, storage } = await bootTopHat();

        expect(storage()).toEqual({ type: "unreadable", error: expect.any(String), rescuedRows });

        // The app is in the same state it would start a new install in, but nothing is written
        expect(data().user.entities[0]!.tutorial).toBe(true);
        dispatch(actions.updateUserPartial({ tutorial: false }));
        await pause(25);

        expect(await readRawFromStore()).toEqual(before);
        expect(await readFromLegacyDatabase()).toEqual(legacy);

        return (storage() as { error: string }).error;
    };

    test("keeps a saved value that won't decode", async () => {
        await writeRawToStore(new Uint8Array([1, 2, 3, 4]).buffer);

        // The row that can't be decoded is the one row rescued
        expect(await expectRecoveryWithoutWrites(1)).toMatch(/damaged/);
    });

    test("keeps a saved value with something other than a list where a list should be", async () => {
        await writeToStore({ ...getSavedData(), statement: "not a list" });

        expect(await expectRecoveryWithoutWrites(countRows(omit(getSavedData(), "statement")))).toMatch(/damaged/);
    });

    test("keeps a saved value with no user in it", async () => {
        await writeToStore({ ...getSavedData(), user: [] });

        expect(await expectRecoveryWithoutWrites(countRows(getSavedData()) - 1)).toMatch(/no user/);
    });

    test("keeps data saved by a newer version of the app", async () => {
        await writeToStore(getSavedData({ generation: CURRENT_GENERATION + 1 }));

        expect(await expectRecoveryWithoutWrites(countRows(getSavedData()))).toMatch(/newer version/);
    });

    test("keeps an old database with no user in it, and copies nothing", async () => {
        await writeToLegacyDatabase({ ...getSavedData(), user: [] });

        await expectRecoveryWithoutWrites(countRows(getSavedData()) - 1);
        expect(await readFromStore()).toBeNull();
    });

    test("keeps an old database saved by a newer version of the app, and copies nothing", async () => {
        await writeToLegacyDatabase(getSavedData({ generation: CURRENT_GENERATION + 1 }));

        await expectRecoveryWithoutWrites(countRows(getSavedData()));
        expect(await readFromStore()).toBeNull();
    });

    test("doesn't mistake a store it has saved into, but can't open now, for a new install", async () => {
        await writeToStore(getSavedData());
        await bootTopHat();
        const saved = await readRawFromStore();

        const open = vi.spyOn(indexedDB, "open").mockImplementation(() => {
            throw new DOMException(
                "The operation failed for reasons unrelated to the database itself.",
                "UnknownError"
            );
        });
        try {
            const { storage } = await bootTopHat();

            // Nothing could be read to rescue, but the data is still there
            expect(storage()).toEqual({ type: "unreadable", error: expect.any(String), rescuedRows: 0 });
        } finally {
            open.mockRestore();
        }
        expect(await readRawFromStore()).toEqual(saved);
    });

    test("deletes both stores from the recovery screen, and then starts afresh", async () => {
        await writeToLegacyDatabase(getSavedData());
        await writeRawToStore(new Uint8Array([1, 2, 3, 4]).buffer);
        localStorage.setItem(
            SYNC_CONFIG_KEY,
            JSON.stringify([{ type: "indexeddb", config: '{"target":{"id":"tophat"}}' }])
        );
        localStorage.setItem(MIGRATION_RECORD_KEY, JSON.stringify({ migratedAt: new Date().toISOString(), boots: 0 }));

        const { storage } = await bootTopHat();
        expect(storage()).toEqual({
            type: "unreadable",
            error: expect.any(String),
            rescuedRows: 1 + countRows(getSavedData()),
        });

        const { deleteDatabase } = await import("./rescue");
        await deleteDatabase(() => undefined);

        expect(await readRawFromStore()).toBeUndefined();
        expect(await getLegacyDatabaseVersion()).toBeNull();
        expect(localStorage.getItem(SYNC_CONFIG_KEY)).toBeNull();
        expect(localStorage.getItem(MIGRATION_RECORD_KEY)).toBeNull();

        const restarted = await bootTopHat();
        expect(restarted.storage()).toEqual({ type: "empty" });
    });
});

describe("Other tabs", () => {
    test("takes changes saved in another tab", async () => {
        await writeToStore(getSavedData());

        const first = await bootTopHat();
        const second = await bootTopHat();

        moveClockForward();
        first.dispatch(first.actions.updateTransactions([{ id: 1, changes: { reference: "TEA" } }]));

        await waitFor(() => expect(second.data().transaction.entities[1]!.reference).toBe("TEA"));
        expect(asLists(second.data())).toEqual(asLists(first.data()));
    });

    test("stops saving when another tab saves data from a newer version of the app", async () => {
        await writeToStore(getSavedData());

        const older = await bootTopHat();
        const newer = await bootTopHat();

        moveClockForward();
        newer.dispatch(newer.actions.setUserGeneration(CURRENT_GENERATION + 1));
        await waitFor(() => expect(older.storage()).toMatchObject({ type: "unreadable" }));
        await waitFor(async () => expect((await readFromStore())!.user[0].generation).toBe(CURRENT_GENERATION + 1));

        // The older tab neither loaded the newer data nor saves over it
        expect(older.data().user.entities[0]!.generation).toBe(CURRENT_GENERATION);
        const saved = await readRawFromStore();
        older.dispatch(older.actions.updateTransactions([{ id: 1, changes: { reference: "TEA" } }]));
        await pause(25);
        expect(await readRawFromStore()).toEqual(saved);
    });

    test("stops backing up to Dropbox when another tab saves data from a newer version of the app", async () => {
        await writeToStore(getSavedData());

        const older = await bootTopHat();
        const newer = await bootTopHat();

        moveClockForward();
        newer.dispatch(newer.actions.setUserGeneration(CURRENT_GENERATION + 1));
        await waitFor(() => expect(older.storage()).toMatchObject({ type: "unreadable" }));
        await pause(25);

        // A change can still land after the freeze - a currency sync started at boot, say - and must
        // not upload this tab's older data over the newer tab's backup
        vi.mocked(maybeSaveDataToDropbox).mockClear();
        older.dispatch(older.actions.updateTransactions([{ id: 1, changes: { reference: "TEA" } }]));
        await pause(25);
        expect(maybeSaveDataToDropbox).not.toHaveBeenCalled();
    });

    test("migrates data saved by an older version of the app in another tab", async () => {
        await writeToStore(getSavedData());

        const current = await bootTopHat();
        const older = await bootTopHat();

        moveClockForward();
        older.dispatch(older.actions.setUserGeneration(CURRENT_GENERATION - 1));
        older.dispatch(older.actions.updateTransactions([{ id: 1, changes: { reference: "TEA" } }]));

        // This tab starts at the current generation, so wait for the older tab's value to arrive first
        await waitFor(() => expect(current.data().transaction.entities[1]!.reference).toBe("TEA"));
        expect(current.data().user.entities[0]!.generation).toBe(CURRENT_GENERATION);

        /*
         * This tab saves the migrated value, but the store isn't checked here: both tabs save the whole
         * value to the same row, with nothing ordering their writes, so the older tab's write can land
         * last and leave the row at its generation. That conflict is deliberately out of scope - it
         * needs two versions of the app open at once, saving within moments of each other - and it is
         * harmless when it happens, since the next boot migrates the stored value again.
         */
    });

    test("stays on the recovery screen when a newer version's data arrives before it has finished booting", async () => {
        // A Dropbox redirect on a new install loads the demo data, and syncs currencies, before boot
        // finishes, which leaves time for another tab to save in between
        let release = () => undefined as void;
        currencySync.hold = new Promise((resolve) => (release = resolve));
        try {
            const older = await startBootingTopHat("dropbox-code");
            await waitFor(async () => expect(await readFromStore()).not.toBeNull());

            const newer = await bootTopHat();
            moveClockForward();
            newer.dispatch(newer.actions.setUserGeneration(CURRENT_GENERATION + 1));
            await waitFor(() => expect(older.tab.storage()).toMatchObject({ type: "unreadable" }));

            // The rest of boot must not replace the recovery screen with what it found beforehand
            release();
            await older.booted;
            expect(older.tab.storage()).toMatchObject({ type: "unreadable", error: expect.stringMatching(/newer/) });
        } finally {
            currencySync.hold = null;
            release();
        }
    });
});

describe("Other tabs, while a boot is migrating", () => {
    // Holds every boot's saves until released, which leaves a boot that migrates waiting on its own
    const saves = { hold: null as Promise<void> | null, held: 0 };

    test("doesn't count towards deleting the old database a boot that ends on the recovery screen", async () => {
        await writeToStore(getSavedData());
        const newer = await bootTopHat();

        // Behind the open tab's back: older data in the store, and an old database one boot from deletion
        await writeToStore(getSavedData({ generation: 3 }));
        await writeToLegacyDatabase(getSavedData());
        const record = { migratedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), boots: 9 };
        localStorage.setItem(MIGRATION_RECORD_KEY, JSON.stringify(record));

        let release = () => undefined as void;
        saves.hold = new Promise((resolve) => (release = resolve));
        vi.doMock("./store", async (importOriginal) => {
            const original = await importOriginal<typeof import("./store")>();
            return {
                ...original,
                openStore: async (callbacks: Parameters<typeof original.openStore>[0]) => {
                    const store = await original.openStore(callbacks);
                    return {
                        ...store,
                        save: async (value: Parameters<typeof store.save>[0]) => {
                            saves.held++;
                            await saves.hold;
                            return store.save(value);
                        },
                    };
                },
            };
        });

        try {
            const older = await startBootingTopHat();
            await waitFor(() => expect(saves.held).toBe(1));

            // The open tab saves data from a newer version while the booting one waits on its migration
            moveClockForward();
            newer.dispatch(newer.actions.setUserGeneration(CURRENT_GENERATION + 1));
            await waitFor(() => expect(older.tab.storage()).toMatchObject({ type: "unreadable" }));

            release();
            await older.booted;

            expect(readMigrationRecord()).toEqual(record);
            expect(await getLegacyDatabaseVersion()).not.toBeNull();
        } finally {
            vi.doUnmock("./store");
            saves.hold = null;
            saves.held = 0;
            release();
        }
    });
});

describe("Copying the database the Dexie version of the app saved into", () => {
    test("copies it into the store, and leaves it as it was, but locked", async () => {
        await writeToLegacyDatabase(getSavedData());

        const { data, storage } = await bootTopHat();

        expect(storage()).toEqual({ type: "loaded" });
        expect(asLists(data())).toEqual(sortLists(getSavedData()));
        expect(await readSortedFromStore()).toEqual(asLists(data()));

        expect(await readFromLegacyDatabase()).toEqual(sortLists(getSavedData()));
        expect(await getLegacyDatabaseVersion()).toBe(LEGACY_LOCKED_VERSION);
        expect(readMigrationRecord()).toEqual({ migratedAt: expect.any(String), boots: 0 });
    });

    test("loads from the store once there is something in it, and leaves the old database alone", async () => {
        await writeToLegacyDatabase(getSavedData());
        await writeToStore({ ...getSavedData(), transaction: [{ ...Coffee, reference: "TEA" }] });

        const { data } = await bootTopHat();

        expect(data().transaction.entities[1]!.reference).toBe("TEA");
        expect(await getLegacyDatabaseVersion()).not.toBe(LEGACY_LOCKED_VERSION);

        // Nothing says this store holds a copy of it, so nothing starts towards its deletion
        expect(readMigrationRecord()).toBeNull();
    });

    test("starts counting boots on a later boot, when the copy was saved too late to be recorded", async () => {
        // The boot that copies the database only records the copy if its own save works. A later save
        // that works leaves the copy in the store, with the database locked but no record of either.
        await writeToLegacyDatabase(getSavedData());
        await bootTopHat();
        localStorage.removeItem(MIGRATION_RECORD_KEY);

        await bootTopHat();
        expect(readMigrationRecord()).toEqual({ migratedAt: expect.any(String), boots: 0 });

        await bootTopHat();
        expect(readMigrationRecord()!.boots).toBe(1);
        expect(await getLegacyDatabaseVersion()).toBe(LEGACY_LOCKED_VERSION);
    });

    test("migrates what it copies, and saves the migrated copy", async () => {
        // Schema version one shipped alongside data generation four, and had no patches table
        await writeToLegacyDatabase(getSavedData({ generation: 4 }), LegacySchemaBeforePatches);

        const { data } = await bootTopHat();

        expect(data().transaction.entities[1]!.reference).toBe("COFFEE");
        expect(data().user.entities[0]!.generation).toBe(5);

        const saved = (await readFromStore())!;
        expect(saved.user[0].generation).toBe(5);
        expect(saved.patches.length).toBeGreaterThan(0);
    });

    test("doesn't read it while another tab holds on to it", async () => {
        await writeToLegacyDatabase(getSavedData());

        // A raw connection, which unlike a Dexie tab does not close when another asks it to
        const other = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open(LEGACY_DATABASE_NAME);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
        try {
            const { storage } = await bootTopHat();

            expect(storage()).toEqual({ type: "failed", error: expect.stringMatching(/another tab/) });
            expect(await readFromStore()).toBeNull();
            expect(readMigrationRecord()).toBeNull();
        } finally {
            other.close();
            log.mockRestore();
        }
    });

    test("counts boots from the store, and deletes the old database once it has been kept long enough", async () => {
        await writeToLegacyDatabase(getSavedData());

        await bootTopHat();
        expect(readMigrationRecord()!.boots).toBe(0);

        await bootTopHat();
        expect(readMigrationRecord()!.boots).toBe(1);

        // One boot short of the count, and a fortnight on
        const migratedAt = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
        localStorage.setItem(MIGRATION_RECORD_KEY, JSON.stringify({ migratedAt, boots: RETENTION_BOOTS - 1 }));

        const { data } = await bootTopHat();

        expect(await getLegacyDatabaseVersion()).toBeNull();
        expect(readMigrationRecord()).toBeNull();
        expect(asLists(data())).toEqual(sortLists(getSavedData()));
    });

    test("loads from the store even when it can't look at the old database", async () => {
        await writeToStore(getSavedData());

        // Retention looks for the old database on every boot from the store
        const databases = vi.spyOn(indexedDB, "databases").mockRejectedValue(new Error("Something broke"));
        const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
        try {
            const { data, dispatch, actions, storage } = await bootTopHat();

            expect(storage()).toEqual({ type: "loaded" });
            expect(asLists(data())).toEqual(sortLists(getSavedData()));
            expect(log).toHaveBeenCalled();

            dispatch(actions.updateUserPartial({ tutorial: true }));
            await waitFor(async () => expect((await readFromStore())!.user[0].tutorial).toBe(true));
        } finally {
            databases.mockRestore();
            log.mockRestore();
        }
    });

    test("loads every field of data saved months ago", async () => {
        await writeToLegacyDatabase(OldSavedData);

        const { data } = await bootTopHat();

        // Optional fields only ever reach the database from a session that filled them in, so this
        // is the only test that says whether they come back out again
        expect(data().institution.entities[1]).toEqual(OldInstitution);
        expect(data().rule.entities[1]).toEqual(OldRule);
        expect(data().statement.entities[1]).toEqual(OldStatement);
        expect(data().user.entities[0]).toEqual(OldUser);
        expect(data().notification.entities[OldNotification.id]).toEqual(OldNotification);

        // Transaction balances are trusted as they were saved, rather than recalculated on load
        expect(data().transaction.entities[1]).toEqual(OldGroceriesTransaction);
        expect(data().transaction.entities[2]).toEqual(OldSalaryTransaction);

        // Account balances are left where they are, unlike the summaries rolled forward below, even
        // though both are read as lists of months counting back from today
        expect(data().account.entities[1]!.balances).toEqual(OldAccount.balances);

        // Everything else is loaded as it was saved, apart from the rolling summary caches below
        const withoutSummary = (entity: object) => omit(entity, "transactions");
        expect(withoutSummary(data().account.entities[1]!)).toEqual(withoutSummary(OldAccount));
        expect(withoutSummary(data().category.entities[1]!)).toEqual(withoutSummary(OldHousehold));
        expect(withoutSummary(data().category.entities[2]!)).toEqual(withoutSummary(OldGroceries));
        expect(withoutSummary(data().category.entities[3]!)).toEqual(withoutSummary(OldIncome));
        expect(withoutSummary(data().currency.entities[1]!)).toEqual(withoutSummary(OldCurrency));

        // The summaries hold the saved values, moved along by the months that have passed since
        const rolled = (values: number[]) => new Array(getMonthsSince(OldMonth)).fill(0).concat(values);
        const expectRolledForward = (loaded: TransactionHistory, saved: TransactionHistory) => {
            expect(loaded.start).toBe(getCurrentMonthString());
            expect(loaded.count).toBe(saved.count);
            expect(loaded.credits).toEqual(rolled(saved.credits));
            expect(loaded.debits).toEqual(rolled(saved.debits));
        };

        expectRolledForward(data().account.entities[1]!.transactions, OldAccount.transactions);
        expectRolledForward(data().category.entities[2]!.transactions, OldGroceries.transactions);
        expectRolledForward(data().category.entities[3]!.transactions, OldIncome.transactions);

        const currency = data().currency.entities[1]!.transactions;
        expectRolledForward(currency, OldCurrency.transactions);
        expect(currency.localCredits).toEqual(rolled(OldCurrency.transactions.localCredits));
        expect(currency.localDebits).toEqual(rolled(OldCurrency.transactions.localDebits));

        /*
         * KNOWN BUG - patches are meant to be pruned once they are thirty days old, but the check
         * compares `diffNow` against a positive number of days, which only ever catches dates in
         * the future. Nothing is pruned, and the history grows for as long as the app is used.
         * Swap these two lines when that is fixed.
         */
        expect(data().patches.entities[OldPatch.id]).toEqual(OldPatch);
        // expect(data().patches.entities[OldPatch.id]).toBeUndefined();
    });
});
