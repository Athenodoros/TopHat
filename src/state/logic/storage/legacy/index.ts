/**
 * The IndexedDB database that the Dexie version of TopHat saved into, which the first boot of the
 * new storage layer copies out of and then leaves alone until it is safe to remove.
 *
 * It is read through the raw IndexedDB API, without a version number, so that whatever schema a
 * browser holds - either one Dexie shipped, or one written by a newer version of the app - opens as
 * it stands without an upgrade being attempted. Nothing here changes its rows: it is only ever
 * locked against old versions of the app, and eventually deleted.
 *
 * The test fixtures read the database through this module too. Until Dexie was removed, that reading
 * was checked against Dexie itself, so the reader the migration relies on is one proven to match.
 */

import type { ListDataState } from "../../../data";
import { DataKeys, DataState, StubUserID, User } from "../../../data/types";

export const LEGACY_DATABASE_NAME = "TopHatDatabase";

/** Dexie has a method called `transaction`, so the table went into the database under this name */
const getStoreName = (key: keyof DataState) => (key === "transaction" ? "transaction_" : key);

/**
 * Whether the database is in the browser, found without opening it: an open of a database that
 * isn't there creates it, and a Dexie tab starting up at that moment could open the empty database
 * before it was removed again. Browsers without `indexedDB.databases()` (Firefox before 126) are
 * assumed to have one, and fall back on the open removing what it created.
 */
const legacyDatabaseExists = async () => {
    if (!("databases" in indexedDB)) return true;

    const databases = await indexedDB.databases();
    return databases.some(({ name }) => name === LEGACY_DATABASE_NAME);
};

const BLOCKED_MESSAGE = "TopHat is open in another tab, which is still holding on to the data.";

/**
 * IndexedDB has no way to take back a request that another tab's connection is blocking: it waits,
 * and goes through as soon as that tab lets go. A Dexie tab lets go as soon as it is asked, so a
 * request still blocked a second later is reported - but it stays queued, and will still go through
 * once the other tab closes. Until then, anything else this tab asks of the database queues up
 * behind it. Returns a function to call once the request settles, so that nothing is reported late.
 */
const reportIfStillBlocked = (request: IDBOpenDBRequest, report: (error: Error) => void) => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    request.onblocked = () => (timeout = setTimeout(() => report(new Error(BLOCKED_MESSAGE)), 1000));
    return () => clearTimeout(timeout);
};

/**
 * Opens whatever is in the browser without a version, so that no upgrade is attempted. If the
 * database turns out not to be there after all, this creates an empty one, which is reported so that
 * it can be removed again.
 *
 * Every connection is closed as soon as it has been used: one left open would block this tab's own
 * locking or deletion of the database, since nothing would ever ask it to close.
 */
const openWithoutUpgrade = () =>
    new Promise<{ db: IDBDatabase; created: boolean }>((resolve, reject) => {
        let created = false;

        const request = indexedDB.open(LEGACY_DATABASE_NAME);
        request.onupgradeneeded = (event) => (created = event.oldVersion === 0);
        request.onsuccess = () => resolve({ db: request.result, created });
        request.onerror = () => reject(request.error);
    });

/**
 * Every row in the database, keyed by the table it is stored in, or null when there is no database.
 * Dexie's internal tables are left out, but tables this version of the app doesn't know are kept.
 */
export const readLegacyTables = async (): Promise<Record<string, unknown[]> | null> => {
    if (!(await legacyDatabaseExists())) return null;

    const { db, created } = await openWithoutUpgrade();

    if (created) {
        db.close();
        await deleteLegacyDatabase();
        return null;
    }

    const stores = Array.from(db.objectStoreNames).filter((name) => !name.startsWith("_"));

    try {
        if (!stores.length) return {};

        return await new Promise<Record<string, unknown[]>>((resolve, reject) => {
            const tx = db.transaction(stores, "readonly");
            const requests = stores.map((name) => tx.objectStore(name).getAll());

            tx.oncomplete = () =>
                resolve(Object.fromEntries(stores.map((name, index) => [name, requests[index].result as unknown[]])));
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
    } finally {
        db.close();
    }
};

/** The tables as the app's lists. A table that isn't there, like patches in the older schema, is empty. */
export const getLegacyLists = (tables: Record<string, unknown[]>) =>
    Object.fromEntries(DataKeys.map((key) => [key, tables[getStoreName(key)] ?? []])) as unknown as ListDataState;

/**
 * Everything the old database holds, or null if it holds nothing.
 *
 * Only a database that is absent or has no rows at all reads as null. One that cannot be read, or
 * has rows but no stub user, throws instead: it may be the only copy of someone's data, so it must
 * never be mistaken for a fresh install. Generations are left for the caller to check.
 */
export const readLegacyDatabase = async (): Promise<ListDataState | null> => {
    const tables = await readLegacyTables();
    if (tables === null) return null;

    const lists = getLegacyLists(tables);

    // Dexie creates every table when it first opens, so an install that never saved has only empty ones
    if (DataKeys.every((key) => lists[key].length === 0)) return null;

    if (!(lists.user as User[]).some(({ id }) => id === StubUserID))
        throw new Error(LEGACY_DATABASE_NAME + " holds data but no user");

    return lists;
};

/**
 * Removes the database. If another tab blocks it, the deletion still happens once that tab lets go.
 * By default a deletion still blocked after a second rejects. A caller that would rather wait for it
 * passes `onStillBlocked` instead, and the promise settles only when the deletion does.
 */
export const deleteLegacyDatabase = (onStillBlocked?: (error: Error) => void) =>
    new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(LEGACY_DATABASE_NAME);
        const settled = reportIfStillBlocked(request, onStillBlocked ?? reject);
        request.onsuccess = () => {
            settled();
            resolve();
        };
        request.onerror = () => {
            settled();
            reject(request.error);
        };
    });

/**
 * Locking
 *
 * Once the new store is in use, a tab still running a Dexie version of TopHat - one left open, or
 * started again from the service worker's cache - must not go on saving into the old database,
 * where nothing reads its changes and retention later deletes them. Every version of TopHat ever
 * released used Dexie 3, which refuses to open a database whose version is higher than its schema
 * declares, and closes its connection when another asks to upgrade. Raising the version, without
 * touching a single row, therefore stops every old tab from reading or writing the database.
 *
 * The migration locks the database before it reads it, so that nothing can be written in between.
 * The reader opens it without a version, so a locked database still reads as it did before.
 */
export const LEGACY_LOCKED_VERSION = 1000; // Far above anything Dexie was given: its version two is stored as 20

/** Locks the database against Dexie versions of the app. Where there is no database, this does nothing. */
export const lockLegacyDatabase = async () => {
    if (!(await legacyDatabaseExists())) return;

    return new Promise<void>((resolve, reject) => {
        let created = false;

        const request = indexedDB.open(LEGACY_DATABASE_NAME, LEGACY_LOCKED_VERSION);
        const settled = reportIfStillBlocked(request, reject);
        request.onupgradeneeded = (event) => (created = event.oldVersion === 0);
        request.onsuccess = () => {
            settled();
            request.result.close();
            resolve(created ? deleteLegacyDatabase() : undefined);
        };
        request.onerror = () => {
            settled();
            // The database is already at a higher version, which only this app could have left it at
            if (request.error?.name === "VersionError") resolve();
            else reject(request.error);
        };
    });
};

/**
 * Retention
 *
 * The old database is not removed as soon as its contents have been copied. It is kept until the
 * new store has been loaded from on ten later boots, and at least a fortnight has passed since the
 * copy, so that anything that goes wrong in between still has the original to fall back on. Only
 * the locked database that was copied is ever deleted: see `getLegacyDatabaseState`.
 */
export const MIGRATION_RECORD_KEY = "tophat-legacy-migration";
export const RETENTION_BOOTS = 10;
export const RETENTION_DAYS = 14;
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export interface MigrationRecord {
    /** When the old database was copied into the new store, as an ISO timestamp */
    migratedAt: string;
    /** Boots since then that loaded from the new store. The boot that made the copy is not one. */
    boots: number;
}

/**
 * The record, or null when there is none. One that can't be understood, or read at all because the
 * browser blocks localStorage, is treated as absent, which keeps the old database.
 */
export const getMigrationRecord = (): MigrationRecord | null => {
    try {
        const stored = localStorage.getItem(MIGRATION_RECORD_KEY);
        if (!stored) return null;

        const record = JSON.parse(stored) as MigrationRecord | null;
        return typeof record?.migratedAt === "string" && typeof record?.boots === "number" ? record : null;
    } catch {
        return null;
    }
};

/** A record that can't be saved only ever delays the deletion, so a failure to save is not an error */
export const setMigrationRecord = (record: MigrationRecord | null) => {
    try {
        if (record === null) localStorage.removeItem(MIGRATION_RECORD_KEY);
        else localStorage.setItem(MIGRATION_RECORD_KEY, JSON.stringify(record));
    } catch {
        // Nothing to do: see above
    }
};

/** Called by the boot that copies the old database, which does not count towards the ten */
export const recordLegacyMigration = (now: Date = new Date()) =>
    setMigrationRecord({ migratedAt: now.toISOString(), boots: 0 });

/**
 * Counts one more boot from the new store, and says whether the old database may now be deleted.
 * Neither threshold is enough alone. A timestamp that doesn't parse never lets the deletion through.
 */
export const countBootFromStore = (record: MigrationRecord, now: Date) => {
    const boots = record.boots + 1;
    const days = (now.valueOf() - new Date(record.migratedAt).valueOf()) / DAY_IN_MILLISECONDS;

    return { record: { ...record, boots }, canDelete: boots >= RETENTION_BOOTS && days >= RETENTION_DAYS };
};

/**
 * Whether the database is there, and whether it is locked. Only a boot copying it into the new store
 * locks it, so a locked database alongside a store that holds data has been copied. One that isn't
 * locked was made by a Dexie version of the app after that - once it had deleted the locked one from
 * its recovery screen, say - and may hold data that the store doesn't.
 */
const getLegacyDatabaseState = async (): Promise<"absent" | "locked" | "unlocked"> => {
    if (!(await legacyDatabaseExists())) return "absent";

    const { db, created } = await openWithoutUpgrade();
    db.close();
    if (created) {
        await deleteLegacyDatabase();
        return "absent";
    }

    return db.version >= LEGACY_LOCKED_VERSION ? "locked" : "unlocked";
};

/**
 * For a boot that loaded from the new store, and only such a boot, so that one which fell back to
 * a default can never count towards a deletion.
 *
 * Where no migration was recorded, the database is left alone - unless it is locked. The boot that
 * copied it only records the copy if its own save works, and a later save in the same session can
 * still put the copy in the store. This boot then records the copy, as if it had just been made.
 */
export const recordBootAndMaybeDeleteLegacyDatabase = async (now: Date = new Date()) => {
    const record = getMigrationRecord();
    if (record === null) {
        if ((await getLegacyDatabaseState()) === "locked") recordLegacyMigration(now);
        return;
    }

    const counted = countBootFromStore(record, now);
    if (!counted.canDelete) return setMigrationRecord(counted.record);

    // Only the database that was copied is ever deleted. One that has gone takes the record with it.
    // One that isn't locked is not the one that was copied, and is kept, with the count, for good.
    const state = await getLegacyDatabaseState();
    if (state === "absent") return setMigrationRecord(null);
    if (state === "unlocked") return setMigrationRecord(counted.record);

    // A deletion blocked by another tab still goes through once it lets go. Until then the count is
    // kept, so a later boot tries again, and finds the database gone if it went through in between.
    await deleteLegacyDatabase().then(
        () => setMigrationRecord(null),
        () => setMigrationRecord(counted.record)
    );
};
