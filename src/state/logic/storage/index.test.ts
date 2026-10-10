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
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { getInitialTutorialLists, toListDataState, type DataState, type ListDataState } from "../../data";
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
import { FAKE_TIMERS_BESIDE_INDEXEDDB, settle } from "./timers.testing";
import {
    deleteLegacyDatabase,
    LEGACY_DATABASE_NAME,
    LEGACY_LOCKED_VERSION,
    lockLegacyDatabase,
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
import type { StorageState } from "./types";

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

    const booted = initialiseAndGetDBConnection(maybeDropboxCode);
    void booted.then(keepManager);

    const tab = {
        dispatch: TopHatDispatch,
        actions: DataSlice.actions,
        data: () => TopHatStore.getState().data,
        storage: () => TopHatStore.getState().app.storage,
    };
    return { tab, booted: booted.then(() => tab) };
};

const bootTopHat = async () => (await startBootingTopHat()).booted;

/** The notifications the latest boot shows, from its own module registry, by key */
const getShownNotifications = async () => {
    const [{ TopHatStore }, { getNotifications }, { getSyncs }] = await Promise.all([
        import("../.."),
        import("../notifications"),
        import("./index"),
    ]);
    const { app, data } = TopHatStore.getState();
    const saved = data.notification.ids.map((id) => data.notification.entities[id]!);
    const shown = getNotifications(saved, { storage: app.storage, syncs: getSyncs(), user: data.user.entities[0]! });
    return Object.fromEntries(shown.map(({ key, display }) => [key, display]));
};

/**
 * Every boot leaves its manager open, the way an open tab would. Boot puts its manager on the window
 * for debugging, which is where it is found - before the end of boot too, so that one whose boot never
 * finished, waiting on a choice, say, is closed as well.
 */
const closeOpenManagers = () => {
    keepManager();
    while (managers.length) managers.pop()!.close();
};
const managers: { close: () => void }[] = [];
const keepManager = () => {
    const manager = (window as { connection?: { manager?: { close: () => void } } }).connection?.manager;
    if (manager && !managers.includes(manager)) managers.push(manager);
};

/** Redux state as sorted lists, so that it can be compared against either store or the fixtures */
const asLists = (data: DataState) => sortLists(toListDataState(data));

/** What is in the store, as sorted lists */
const readSortedFromStore = async () => {
    const value = await readFromStore();
    return value && sortLists(value);
};

/** Months between a fixture's hard-coded month and this one, which is how far caches roll forward */
const getMonthsSince = (month: SDate) => getCurrentMonth().diff(parseDate(month), "months").months;

// Captured before any test fakes it
const realSetTimeout = setTimeout;

/**
 * Showing that a change was not saved, sent to another tab or backed up takes a wait, since there is
 * nothing to wait for. This moves time on one `vi.waitFor` step, so that every timer the change set
 * goes off, then gives a write that did start a little real time to reach IndexedDB.
 */
const runChangeThrough = async () => {
    await vi.advanceTimersByTimeAsync(50);
    await new Promise((resolve) => realSetTimeout(resolve, 25));
};

/** A manager only takes a value from another tab if it is newer than its own, so tabs that write move the clock */
const moveClockForward = () => vi.setSystemTime(Date.now() + 1000);

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

beforeEach(() => void vi.useFakeTimers(FAKE_TIMERS_BESIDE_INDEXEDDB));

// Closing the managers a test booted, and then the channels, stops one test's tabs hearing the next's,
// and deleting the store closes their connections to it.
afterEach(async () => {
    // A save whose timer has not gone off never will, and a closed manager starts nothing more. One that
    // has may still be on its way, and must not reach the next test's store or post to a closed channel.
    vi.useRealTimers();
    closeOpenManagers();
    await new Promise((resolve) => setTimeout(resolve, 25));
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
        await vi.waitFor(async () => expect(await readSortedFromStore()).toEqual(asLists(data())));
        expect(await getLegacyDatabaseVersion()).toBeNull();
    });

    test("saves the whole state when anything changes", async () => {
        const { data, dispatch, actions } = await bootTopHat();

        dispatch(actions.updateUserPartial({ tutorial: false }));

        await vi.waitFor(async () => expect((await readFromStore())!.user[0].tutorial).toBe(false));
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
        await vi.waitFor(async () => expect(await readSortedFromStore()).toEqual(asLists(first.data())));

        const second = await bootTopHat();

        expect(second.data().transaction.entities[1]!.reference).toBe("TEA");
        expect(second.data().transaction.entities[2]!.reference).toBe("BOOKS");
        expect(asLists(second.data())).toEqual(asLists(first.data()));
    });

    test("saves a deletion that is the first change of a session", async () => {
        await writeToStore(getSavedData());

        const { data, dispatch, actions } = await bootTopHat();
        dispatch(actions.deleteTransactions([1]));

        await vi.waitFor(async () => expect(await readSortedFromStore()).toEqual(asLists(data())));

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
        await vi.waitFor(async () => expect(await readSortedFromStore()).toEqual(asLists(data())));
    });

    test("warns that nothing can be saved as soon as it boots, when IndexedDB can't be used", async () => {
        // As in some private browsing modes
        const open = vi.spyOn(indexedDB, "open").mockImplementation(() => {
            throw new DOMException("The operation is insecure.", "SecurityError");
        });

        try {
            const { data, storage } = await bootTopHat();
            const { IDB_DEVICE_NOTIFICATION_ID } = await import("../notifications/types");

            expect(storage()).toEqual({ type: "unavailable", error: expect.any(String) });

            // Without the user having changed anything, and with no dismiss button
            const warning = (await getShownNotifications())[IDB_DEVICE_NOTIFICATION_ID];
            expect(warning).toBeDefined();
            expect(warning.dismiss).toBeUndefined();

            // It is about this browser, so it isn't saved with the data, which would carry it to other devices
            expect(data().notification.entities[IDB_DEVICE_NOTIFICATION_ID]).toBeUndefined();
        } finally {
            open.mockRestore();
        }
    });

    test("warns that nothing is being saved while the browser's last save failed, until one works", async () => {
        const { dispatch, actions } = await bootTopHat();
        const { IDB_DEVICE_NOTIFICATION_ID } = await import("../notifications/types");
        expect(await getShownNotifications()).not.toHaveProperty(IDB_DEVICE_NOTIFICATION_ID);

        // The write is turned down, as IndexedDB does when the disk is full, say
        const put = vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => {
            const request = {} as IDBRequest;
            setImmediate(() => request.onerror?.(new Event("error")));
            return request;
        });
        try {
            dispatch(actions.updateUserPartial({ tutorial: false }));
            await vi.waitFor(async () =>
                expect(await getShownNotifications()).toHaveProperty(IDB_DEVICE_NOTIFICATION_ID)
            );
        } finally {
            put.mockRestore();
        }

        dispatch(actions.updateUserPartial({ tutorial: true }));
        await vi.waitFor(async () =>
            expect(await getShownNotifications()).not.toHaveProperty(IDB_DEVICE_NOTIFICATION_ID)
        );
    });

    test("drops the save warning an earlier version kept in the data", async () => {
        await writeToStore({ ...getSavedData(), notification: [{ id: "idb-sync-failed", contents: "" }] });

        const { data } = await bootTopHat();

        expect(data().notification.ids).toEqual([]);
    });

    test("keeps, but doesn't show, a notification this version has no rule for", async () => {
        // Added by a newer version, which can do so without changing the generation
        await writeToStore({ ...getSavedData(), notification: [{ id: "from-a-newer-version", contents: "" }] });

        const { data, dispatch, actions } = await bootTopHat();
        dispatch(actions.updateUserPartial({ tutorial: false }));

        expect(data().notification.ids).toEqual(["from-a-newer-version"]);
        expect(Object.keys(await getShownNotifications())).toEqual([]);
        await vi.waitFor(async () => expect((await readFromStore())!.user[0].tutorial).toBe(false));
        expect((await readFromStore())!.notification).toEqual([{ id: "from-a-newer-version", contents: "" }]);
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
        await runChangeThrough();

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

        await vi.waitFor(() => expect(second.data().transaction.entities[1]!.reference).toBe("TEA"));
        expect(asLists(second.data())).toEqual(asLists(first.data()));
    });

    test("stops saving when another tab saves data from a newer version of the app", async () => {
        await writeToStore(getSavedData());

        const older = await bootTopHat();
        const newer = await bootTopHat();

        moveClockForward();
        newer.dispatch(newer.actions.setUserGeneration(CURRENT_GENERATION + 1));
        await vi.waitFor(() => expect(older.storage()).toMatchObject({ type: "unreadable" }));
        await vi.waitFor(async () => expect((await readFromStore())!.user[0].generation).toBe(CURRENT_GENERATION + 1));

        // The older tab neither loaded the newer data nor saves over it
        expect(older.data().user.entities[0]!.generation).toBe(CURRENT_GENERATION);
        const saved = await readRawFromStore();
        older.dispatch(older.actions.updateTransactions([{ id: 1, changes: { reference: "TEA" } }]));
        await runChangeThrough();
        expect(await readRawFromStore()).toEqual(saved);
    });

    test("stops backing up to Dropbox when another tab saves data from a newer version of the app", async () => {
        await writeToStore(getSavedData());

        const older = await bootTopHat();
        const newer = await bootTopHat();

        moveClockForward();
        newer.dispatch(newer.actions.setUserGeneration(CURRENT_GENERATION + 1));
        await vi.waitFor(() => expect(older.storage()).toMatchObject({ type: "unreadable" }));
        await runChangeThrough();

        // A change can still land after the freeze - a currency sync started at boot, say - and must
        // not upload this tab's older data over the newer tab's backup
        vi.mocked(maybeSaveDataToDropbox).mockClear();
        older.dispatch(older.actions.updateTransactions([{ id: 1, changes: { reference: "TEA" } }]));
        await runChangeThrough();
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
        await vi.waitFor(() => expect(current.data().transaction.entities[1]!.reference).toBe("TEA"));
        expect(current.data().user.entities[0]!.generation).toBe(CURRENT_GENERATION);

        /*
         * Both tabs run this version of the app: the older one only saves data at an older generation.
         * A real older version would refuse this tab's migrated value and stop saving instead, which
         * "stops saving when another tab saves data from a newer version of the app" covers.
         *
         * So the store isn't checked here. This tab saves the migrated value, but both tabs save the
         * whole value to the same row with nothing ordering their writes, and the older tab's can land
         * last, leaving the row at its generation. That is deliberately out of scope: it needs two
         * versions of the app saving within moments of each other, the row still holds the same data,
         * and the next boot migrates it again.
         */
    });

    test("stays on the recovery screen when a newer version's data arrives before it has finished booting", async () => {
        // A Dropbox redirect on a new install loads the demo data, and syncs currencies, before boot
        // finishes, which leaves time for another tab to save in between
        let release = () => undefined as void;
        currencySync.hold = new Promise((resolve) => (release = resolve));
        try {
            const older = await startBootingTopHat("dropbox-code");
            await vi.waitFor(async () => expect(await readFromStore()).not.toBeNull());

            const newer = await bootTopHat();
            moveClockForward();
            newer.dispatch(newer.actions.setUserGeneration(CURRENT_GENERATION + 1));
            await vi.waitFor(() => expect(older.tab.storage()).toMatchObject({ type: "unreadable" }));

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

        // Behind the open tab's back: older data in the store, and a copied old database one boot from deletion
        await writeToStore(getSavedData({ generation: 3 }));
        await writeToLegacyDatabase(getSavedData());
        await lockLegacyDatabase();
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
            await vi.waitFor(() => expect(saves.held).toBe(1));

            // The open tab saves data from a newer version while the booting one waits on its migration
            moveClockForward();
            newer.dispatch(newer.actions.setUserGeneration(CURRENT_GENERATION + 1));
            await vi.waitFor(() => expect(older.tab.storage()).toMatchObject({ type: "unreadable" }));

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

    test("loads from the store once there is something in it, rather than the database it was copied from", async () => {
        await writeToLegacyDatabase(getSavedData());
        await lockLegacyDatabase();
        await writeToStore({ ...getSavedData(), transaction: [{ ...Coffee, reference: "TEA" }] });

        const { data, storage } = await bootTopHat();

        expect(storage()).toEqual({ type: "loaded" });
        expect(data().transaction.entities[1]!.reference).toBe("TEA");
        expect(await readFromLegacyDatabase()).toEqual(sortLists(getSavedData()));
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
            const { storage } = await settle(bootTopHat());

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
            await vi.waitFor(async () => expect((await readFromStore())!.user[0].tutorial).toBe(true));
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

/** The copies a boot waiting on the user is offering, and the function that keeps one of them */
const getConflict = async (storage: () => StorageState) => {
    await vi.waitFor(() => expect(storage()).toMatchObject({ type: "conflict" }));
    const { chooseStorageCopy } = await import("./index");
    return { copies: (storage() as StorageState & { type: "conflict" }).copies, chooseStorageCopy };
};

/** The same saved data, told apart by the reference of its one transaction */
const withReference = (reference: string): ListDataState => ({
    ...getSavedData(),
    transaction: [{ ...Coffee, reference }],
});

describe("Copies in two targets that disagree", () => {
    /**
     * A second row in the store's database, listed alongside the store in the saved list of targets,
     * stands in for a remote target: the library reads, writes and timestamps it in the same way, with
     * no network involved, and TopHat treats any target but its own row as somewhere else.
     */
    const REMOTE_ID = "remote";

    /**
     * The saved list of targets, with the history the library keeps for each: the target's own
     * timestamp for the last value written there or read from there, and whether a save missed it
     */
    const listBothTargets = (
        ids = [STORE_ID, REMOTE_ID],
        history: Record<string, { lastProcessedWriteTime?: Date; missedWrite?: boolean }> = {}
    ) =>
        localStorage.setItem(
            SYNC_CONFIG_KEY,
            JSON.stringify(
                ids.map((id) => ({
                    type: "indexeddb",
                    config: JSON.stringify({ target: { id }, compressed: true, ...history[id] }),
                }))
            )
        );

    /** What the library has saved about a target's history, in the list `listBothTargets` writes */
    const readTargetHistory = (id: string): { missedWrite?: boolean } =>
        JSON.parse(localStorage.getItem(SYNC_CONFIG_KEY)!)
            .map(({ config }: { config: string }) => JSON.parse(config))
            .find(({ target }: { target: { id: string } }) => target.id === id);

    const readReference = async (id: string = STORE_ID) => (await readFromStore(id))!.transaction[0].reference;

    // When the two copies last agreed, by their own clocks. A copy saved at any other time has moved on.
    const AGREED_LOCAL = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const AGREED_REMOTE = new Date(AGREED_LOCAL.valueOf() + 5000);
    const MOVED = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const saveCopies = async (
        local: { reference: string; moved: boolean },
        remote: { reference: string; moved: boolean }
    ) => {
        listBothTargets(undefined, {
            [STORE_ID]: { lastProcessedWriteTime: AGREED_LOCAL },
            [REMOTE_ID]: { lastProcessedWriteTime: AGREED_REMOTE },
        });
        await writeToStore(withReference(local.reference), STORE_ID, local.moved ? MOVED : AGREED_LOCAL);
        await writeToStore(withReference(remote.reference), REMOTE_ID, remote.moved ? MOVED : AGREED_REMOTE);
    };

    test("takes the other copy, without asking, when only it has moved on", async () => {
        await saveCopies({ reference: "AGREED", moved: false }, { reference: "REMOTE", moved: true });

        const { data, storage } = await bootTopHat();

        await vi.waitFor(() => expect(data().transaction.entities[1]!.reference).toBe("REMOTE"));
        await vi.waitFor(async () => expect(await readReference()).toBe("REMOTE"));
        expect(storage()).toEqual({ type: "loaded" });
    });

    test("asks which to keep when both have moved on, and writes nothing anywhere until the user chooses", async () => {
        await saveCopies({ reference: "LOCAL", moved: true }, { reference: "REMOTE", moved: true });
        const before = { local: await readRawFromStore(), remote: await readRawFromStore(REMOTE_ID) };

        const { data, dispatch, actions, storage } = await bootTopHat();
        const { copies, chooseStorageCopy } = await getConflict(storage);

        expect(copies.map(({ source }) => source)).toEqual([
            { type: "browser" },
            { type: "remote", target: "indexeddb" },
        ]);
        expect(copies.map(({ savedAt }) => savedAt)).toEqual([MOVED.toISOString(), MOVED.toISOString()]);

        // Not even a change in the meantime is saved, sent to other tabs, or backed up
        vi.mocked(maybeSaveDataToDropbox).mockClear();
        const announce = vi.spyOn(BroadcastChannel.prototype, "postMessage");
        try {
            dispatch(actions.updateUserPartial({ alphavantage: "CHANGED" }));
            await runChangeThrough();

            expect(announce).not.toHaveBeenCalled();
        } finally {
            announce.mockRestore();
        }
        expect(await readRawFromStore()).toEqual(before.local);
        expect(await readRawFromStore(REMOTE_ID)).toEqual(before.remote);
        expect(maybeSaveDataToDropbox).not.toHaveBeenCalled();

        await chooseStorageCopy(copies[1].id);

        expect(storage()).toEqual({ type: "loaded" });
        await vi.waitFor(() => expect(data().transaction.entities[1]!.reference).toBe("REMOTE"));
        await vi.waitFor(async () => expect(await readReference()).toBe("REMOTE"));
        expect(await readReference(REMOTE_ID)).toBe("REMOTE");
    });

    test("saves the browser's copy to the other when the user keeps it, with changes made while choosing", async () => {
        await saveCopies({ reference: "LOCAL", moved: true }, { reference: "REMOTE", moved: true });

        const { data, dispatch, actions, storage } = await bootTopHat();
        const { copies, chooseStorageCopy } = await getConflict(storage);

        // A currency sync started at boot, say, lands while the user is choosing
        dispatch(actions.updateUserPartial({ alphavantage: "CHANGED" }));
        await chooseStorageCopy(copies[0].id);

        expect(storage()).toEqual({ type: "loaded" });
        expect(data().transaction.entities[1]!.reference).toBe("LOCAL");
        expect(data().user.entities[0]!.alphavantage).toBe("CHANGED");
        await vi.waitFor(async () => expect((await readFromStore(REMOTE_ID))!.user[0].alphavantage).toBe("CHANGED"));
        expect(await readReference(REMOTE_ID)).toBe("LOCAL");
        expect((await readFromStore())!.user[0].alphavantage).toBe("CHANGED");
    });

    // Targets are read in the order they are listed. Read first, the newer copy is refused before the
    // store has opened; read second, it is refused after the app has loaded the browser's.
    test.each([
        ["read after", [STORE_ID, REMOTE_ID]],
        ["read before", [REMOTE_ID, STORE_ID]],
    ])(
        "leaves both copies exactly as they were when the other holds data from a newer version, %s the browser's",
        async (_, ids) => {
            listBothTargets(ids);
            await writeToStore(getSavedData());
            await writeToStore(getSavedData({ generation: CURRENT_GENERATION + 1 }), REMOTE_ID);
            const before = { local: await readRawFromStore(), remote: await readRawFromStore(REMOTE_ID) };

            const { dispatch, actions, storage } = await bootTopHat();
            await vi.waitFor(() =>
                expect(storage()).toMatchObject({ type: "unreadable", error: expect.stringMatching(/newer/) })
            );

            dispatch(actions.updateUserPartial({ alphavantage: "CHANGED" }));
            await runChangeThrough();

            expect(await readRawFromStore()).toEqual(before.local);
            expect(await readRawFromStore(REMOTE_ID)).toEqual(before.remote);
        }
    );

    test("keeps the browser's copy, without asking, when a save reached it but not the other", async () => {
        listBothTargets();
        await writeToStore(getSavedData());
        await writeToStore(getSavedData(), REMOTE_ID);

        const { dispatch, actions } = await bootTopHat();

        dispatch(actions.updateUserPartial({ alphavantage: "KEY-1" }));
        await vi.waitFor(async () => expect((await readFromStore(REMOTE_ID))!.user[0].alphavantage).toBe("KEY-1"));

        // A write to the other copy that fails, as a remote one does offline: `add` refuses a key that is already there
        const put = IDBObjectStore.prototype.put;
        const failing = vi
            .spyOn(IDBObjectStore.prototype, "put")
            .mockImplementation(function (this: IDBObjectStore, value: any, key?: IDBValidKey) {
                return value?.id === REMOTE_ID ? this.add(value, key) : put.call(this, value, key);
            });
        try {
            dispatch(actions.updateUserPartial({ alphavantage: "KEY-2" }));
            await vi.waitFor(() => expect(readTargetHistory(REMOTE_ID).missedWrite).toBe(true));
            expect((await readFromStore())!.user[0].alphavantage).toBe("KEY-2");
            expect((await readFromStore(REMOTE_ID))!.user[0].alphavantage).toBe("KEY-1");
        } finally {
            failing.mockRestore();
        }

        // Neither copy has been written by anything else since, so they would look equally untouched,
        // but the other copy is behind
        const next = await bootTopHat();

        await vi.waitFor(async () => expect((await readFromStore(REMOTE_ID))!.user[0].alphavantage).toBe("KEY-2"));
        expect(next.storage()).toEqual({ type: "loaded" });
        expect(next.data().user.entities[0]!.alphavantage).toBe("KEY-2");
    });
});

describe("A database the Dexie version of the app saved into after the copy", () => {
    // Only a copying boot locks the old database, so an unlocked one next to a store that holds data
    // was made since: a Dexie version of the app deleted the locked one, and started saving again
    const saveBoth = async (legacy: Partial<ListDataState> = getSavedData()) => {
        await writeToStore(withReference("TEA"));
        await writeToLegacyDatabase(legacy);
    };

    test("asks which to keep, and changes neither until the user chooses", async () => {
        await saveBoth();
        const before = await readRawFromStore();
        vi.mocked(maybeSaveDataToDropbox).mockClear();

        const { tab, booted } = await startBootingTopHat();
        const { copies, chooseStorageCopy } = await getConflict(tab.storage);

        expect(copies.map(({ source }) => source)).toEqual([{ type: "browser" }, { type: "legacy" }]);

        await runChangeThrough();
        expect(await readRawFromStore()).toEqual(before);
        expect(await getLegacyDatabaseVersion()).not.toBe(LEGACY_LOCKED_VERSION);
        expect(await readFromLegacyDatabase()).toEqual(sortLists(getSavedData()));
        expect(maybeSaveDataToDropbox).not.toHaveBeenCalled();

        // Kept, it is copied the way the first copy was: locked, read, saved and recorded
        await chooseStorageCopy(copies[1].id);
        await booted;

        expect(tab.storage()).toEqual({ type: "loaded" });
        expect(tab.data().transaction.entities[1]!.reference).toBe("COFFEE");
        expect((await readFromStore())!.transaction[0].reference).toBe("COFFEE");
        expect(await getLegacyDatabaseVersion()).toBe(LEGACY_LOCKED_VERSION);
        expect(await readFromLegacyDatabase()).toEqual(sortLists(getSavedData()));
        expect(readMigrationRecord()).toEqual({ migratedAt: expect.any(String), boots: 0 });
    });

    test("locks it when the user keeps the store, and keeps it as long as one that has just been copied", async () => {
        await saveBoth();
        // An earlier copy, long enough ago that the database it recorded could be deleted now
        const long = {
            migratedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            boots: RETENTION_BOOTS,
        };
        localStorage.setItem(MIGRATION_RECORD_KEY, JSON.stringify(long));

        const { tab, booted } = await startBootingTopHat();
        const { copies, chooseStorageCopy } = await getConflict(tab.storage);
        await chooseStorageCopy(copies[0].id);
        await booted;

        expect(tab.data().transaction.entities[1]!.reference).toBe("TEA");
        expect((await readFromStore())!.transaction[0].reference).toBe("TEA");
        expect(await getLegacyDatabaseVersion()).toBe(LEGACY_LOCKED_VERSION);
        expect(readMigrationRecord()).toEqual({ migratedAt: expect.any(String), boots: 0 });
        expect(readMigrationRecord()).not.toEqual(long);

        // The next boot doesn't ask again, and counts from the lock
        const next = await bootTopHat();
        expect(next.storage()).toEqual({ type: "loaded" });
        expect(readMigrationRecord()!.boots).toBe(1);
        expect(await readFromLegacyDatabase()).toEqual(sortLists(getSavedData()));
    });

    test("locks it without asking when it holds nothing of the user's", async () => {
        await saveBoth(getInitialTutorialLists());

        const { data, storage } = await bootTopHat();

        expect(storage()).toEqual({ type: "loaded" });
        expect(data().transaction.entities[1]!.reference).toBe("TEA");
        expect(await getLegacyDatabaseVersion()).toBe(LEGACY_LOCKED_VERSION);
    });

    test("goes to the recovery screen, and copies nothing, when the copy chosen can no longer be used", async () => {
        await saveBoth();
        const before = await readRawFromStore();

        const { tab } = await startBootingTopHat();
        const { copies, chooseStorageCopy } = await getConflict(tab.storage);

        // An old tab can still save into it until it is locked, which happens once it is chosen
        await writeToLegacyDatabase({ user: [{ ...getSavedData().user[0], generation: CURRENT_GENERATION + 1 }] });
        await chooseStorageCopy(copies[1].id);

        await vi.waitFor(() =>
            expect(tab.storage()).toMatchObject({ type: "unreadable", error: expect.stringMatching(/newer/) })
        );
        expect(await readRawFromStore()).toEqual(before);
        expect(readMigrationRecord()).toBeNull();
    });
});
