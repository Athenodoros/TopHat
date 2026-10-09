/**
 * Tests for reading the database the Dexie version of TopHat saved into, and for the rules on when
 * it can be deleted. The database is set up through the raw fixtures in `fixtures.testing.ts`, so
 * these say what the reader makes of the tables as they are really left in the browser.
 *
 * @vitest-environment jsdom
 */

import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
    countBootFromStore,
    deleteLegacyDatabase,
    LEGACY_DATABASE_NAME,
    LEGACY_LOCKED_VERSION,
    lockLegacyDatabase,
    MIGRATION_RECORD_KEY,
    MigrationRecord,
    readLegacyDatabase,
    readLegacyTables,
    recordBootAndMaybeDeleteLegacyDatabase,
    recordLegacyMigration,
    RETENTION_BOOTS,
} from ".";
import {
    getSavedData,
    LegacySchema,
    LegacySchemaBeforePatches,
    OldSavedData,
    sortLists,
    writeToLegacyDatabase,
} from "./fixtures.testing";
import { FAKE_TIMERS_BESIDE_INDEXEDDB, settle } from "../timers.testing";

/** The version of the database in the browser, or null if there is none, without creating one by asking */
const getLegacyDatabaseVersion = async () => {
    const databases = await indexedDB.databases();
    return databases.find(({ name }) => name === LEGACY_DATABASE_NAME)?.version ?? null;
};

/** A raw connection, which unlike a Dexie tab does not close when another asks it to */
const openInAnotherTab = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(LEGACY_DATABASE_NAME);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

const readMigrationRecord = (): MigrationRecord | null => {
    const stored = localStorage.getItem(MIGRATION_RECORD_KEY);
    return stored ? (JSON.parse(stored) as MigrationRecord) : null;
};

const writeMigrationRecord = (record: MigrationRecord) =>
    localStorage.setItem(MIGRATION_RECORD_KEY, JSON.stringify(record));

/** An ISO timestamp some number of days before now, which may be fractional */
const daysAgo = (days: number, now: Date = new Date()) =>
    new Date(now.valueOf() - days * 24 * 60 * 60 * 1000).toISOString();

// A request another tab blocks is reported a second later, which these move fake time on to
beforeEach(() => void vi.useFakeTimers(FAKE_TIMERS_BESIDE_INDEXEDDB));
afterEach(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    await deleteLegacyDatabase();
    localStorage.clear();
});

describe("The legacy database reader", () => {
    test("reads the schema before patches without upgrading it", async () => {
        await writeToLegacyDatabase(OldSavedData, LegacySchemaBeforePatches);

        expect(sortLists((await readLegacyDatabase())!)).toEqual(sortLists({ ...OldSavedData, patches: [] }));
        expect(await getLegacyDatabaseVersion()).toBe(LegacySchemaBeforePatches.version);
    });

    test("reads nothing, and leaves nothing behind, when there is no database", async () => {
        const open = vi.spyOn(indexedDB, "open");

        expect(await readLegacyDatabase()).toBeNull();

        // Opening a database that isn't there creates it, which a Dexie tab starting up could then open
        expect(open).not.toHaveBeenCalled();
        expect(await getLegacyDatabaseVersion()).toBeNull();
    });

    test("removes the empty database its own open creates, if the database goes before it is opened", async () => {
        vi.spyOn(indexedDB, "databases").mockResolvedValue([{ name: LEGACY_DATABASE_NAME, version: 20 }]);

        expect(await readLegacyDatabase()).toBeNull();

        vi.restoreAllMocks();
        expect(await getLegacyDatabaseVersion()).toBeNull();
    });

    test("reads nothing from empty tables, and leaves them where they are", async () => {
        await writeToLegacyDatabase({});

        expect(await readLegacyDatabase()).toBeNull();
        expect(await getLegacyDatabaseVersion()).toBe(LegacySchema.version);
    });

    test("keeps tables that a later version of the app added, which this one doesn't know", async () => {
        await writeToLegacyDatabase(getSavedData());

        const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open(LEGACY_DATABASE_NAME, LegacySchema.version + 10);
            request.onupgradeneeded = () =>
                request.result.createObjectStore("budget", { keyPath: "id" }).put({ id: 1 });
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        db.close();

        const tables = (await readLegacyTables())!;
        expect(tables.budget).toEqual([{ id: 1 }]);
        expect(tables.user).toEqual(getSavedData().user);
    });

    test("refuses data without a user, rather than reading it as nothing", async () => {
        await writeToLegacyDatabase({ ...getSavedData(), user: [] });

        await expect(readLegacyDatabase()).rejects.toThrow();
    });
});

describe("Locking the legacy database", () => {
    test("raises its version without changing what it holds, however often it is asked", async () => {
        await writeToLegacyDatabase(OldSavedData, LegacySchemaBeforePatches);

        await lockLegacyDatabase();
        await lockLegacyDatabase();

        expect(await getLegacyDatabaseVersion()).toBe(LEGACY_LOCKED_VERSION);
        expect(sortLists((await readLegacyDatabase())!)).toEqual(sortLists({ ...OldSavedData, patches: [] }));
    });

    test("fails while another tab holds on to the database, which is left as it was", async () => {
        await writeToLegacyDatabase(getSavedData());
        const tab = await openInAnotherTab();

        await expect(settle(lockLegacyDatabase())).rejects.toThrow("open in another tab");
        expect(await getLegacyDatabaseVersion()).toBe(LegacySchema.version);

        tab.close();
    });

    test("leaves nothing behind when there is no database", async () => {
        const open = vi.spyOn(indexedDB, "open");

        await lockLegacyDatabase();

        expect(open).not.toHaveBeenCalled();
        expect(await getLegacyDatabaseVersion()).toBeNull();
    });
});

describe("Deleting the legacy database", () => {
    test("can wait for another tab to let go, rather than failing", async () => {
        await writeToLegacyDatabase(getSavedData());
        const tab = await openInAnotherTab();
        let onStillBlocked!: () => void;
        const stillBlocked = new Promise<void>((resolve) => (onStillBlocked = resolve));

        const deleted = deleteLegacyDatabase(onStillBlocked);
        await settle(stillBlocked);

        tab.close();
        await deleted;
        expect(await getLegacyDatabaseVersion()).toBeNull();
    });
});

describe("The legacy database retention policy", () => {
    test("needs both ten boots and fourteen days", () => {
        const now = new Date();
        const canDelete = (days: number, earlierBoots: number) =>
            countBootFromStore({ migratedAt: daysAgo(days, now), boots: earlierBoots }, now).canDelete;

        expect(canDelete(365, RETENTION_BOOTS - 2)).toBe(false);
        expect(canDelete(13.99, 100)).toBe(false);
        expect(canDelete(14, RETENTION_BOOTS - 1)).toBe(true);
    });

    test("never deletes on a timestamp it can't read", () => {
        expect(countBootFromStore({ migratedAt: "yesterday", boots: 100 }, new Date()).canDelete).toBe(false);
    });

    test("deletes the database on the tenth boot after the copy, and not before", async () => {
        await writeToLegacyDatabase(getSavedData());
        await lockLegacyDatabase();
        recordLegacyMigration(new Date(daysAgo(20)));

        for (let boot = 1; boot < RETENTION_BOOTS; boot++) {
            await recordBootAndMaybeDeleteLegacyDatabase();
            expect(readMigrationRecord()).toEqual({ migratedAt: expect.any(String), boots: boot });
        }
        expect(await getLegacyDatabaseVersion()).toBe(LEGACY_LOCKED_VERSION);

        await recordBootAndMaybeDeleteLegacyDatabase();
        expect(await getLegacyDatabaseVersion()).toBeNull();
        expect(readMigrationRecord()).toBeNull();
    });

    test("never deletes a database that isn't locked, which a Dexie version of the app made since the copy", async () => {
        await writeToLegacyDatabase(getSavedData());
        writeMigrationRecord({ migratedAt: daysAgo(20), boots: RETENTION_BOOTS - 1 });

        await recordBootAndMaybeDeleteLegacyDatabase();
        await recordBootAndMaybeDeleteLegacyDatabase();

        expect(await getLegacyDatabaseVersion()).toBe(LegacySchema.version);
        expect(readMigrationRecord()).toEqual({ migratedAt: expect.any(String), boots: RETENTION_BOOTS + 1 });
    });

    test("forgets the record once the database has gone, without leaving one behind", async () => {
        writeMigrationRecord({ migratedAt: daysAgo(20), boots: RETENTION_BOOTS - 1 });

        await recordBootAndMaybeDeleteLegacyDatabase();

        expect(await getLegacyDatabaseVersion()).toBeNull();
        expect(readMigrationRecord()).toBeNull();
    });

    test("keeps the database when there is no record it can read", async () => {
        await writeToLegacyDatabase(getSavedData());

        await recordBootAndMaybeDeleteLegacyDatabase();
        localStorage.setItem(MIGRATION_RECORD_KEY, "not a record");
        await recordBootAndMaybeDeleteLegacyDatabase();

        expect(await getLegacyDatabaseVersion()).toBe(LegacySchema.version);
    });

    test("keeps the database when the browser blocks localStorage", async () => {
        await writeToLegacyDatabase(getSavedData());
        writeMigrationRecord({ migratedAt: daysAgo(20), boots: RETENTION_BOOTS - 1 });

        const blocked = () => {
            throw new DOMException("The operation is insecure.", "SecurityError");
        };
        vi.spyOn(Storage.prototype, "getItem").mockImplementation(blocked);
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(blocked);

        recordLegacyMigration();
        await recordBootAndMaybeDeleteLegacyDatabase();

        expect(await getLegacyDatabaseVersion()).toBe(LegacySchema.version);
    });

    test("keeps counting when another tab blocks the deletion", async () => {
        await writeToLegacyDatabase(getSavedData());
        await lockLegacyDatabase();
        writeMigrationRecord({ migratedAt: daysAgo(20), boots: RETENTION_BOOTS - 1 });

        const tab = await openInAnotherTab();

        await settle(recordBootAndMaybeDeleteLegacyDatabase());
        expect(readMigrationRecord()).toEqual({ migratedAt: expect.any(String), boots: RETENTION_BOOTS });

        tab.close();
    });
});
