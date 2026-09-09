/**
 * The Dexie database that TopHat used to save into, which is read once on the first boot after the
 * upgrade and then left alone until it is safe to remove.
 *
 * It is read through the raw IndexedDB API, without a version number, so that whatever schema
 * version a browser happens to hold opens without an upgrade being attempted. It is never written
 * to: the copy in the new store is the one the app works with from here on, and this one is kept
 * only so that a migration that went wrong can still be recovered from.
 */

import { zipObject } from "../../../shared/data";
import type { ListDataState } from "../../data";
import { DataKeys, DataState } from "../../data/types";

export const LEGACY_DATABASE_NAME = "TopHatDatabase";

/** Dexie has a method called `transaction`, so the table went into the database under this name */
type LegacyStoreName = keyof Omit<DataState, "transaction"> | "transaction_";
const getStoreName = (key: keyof DataState): LegacyStoreName =>
    key === "transaction" ? "transaction_" : (key as LegacyStoreName);

/** Opens whatever is in the browser without a version, so that no upgrade is attempted */
const openWithoutUpgrade = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(LEGACY_DATABASE_NAME);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error("Blocked opening " + LEGACY_DATABASE_NAME));
    });

/**
 * Everything the old database still holds, or null if there is nothing there to load.
 *
 * Opening without a version creates an empty database when none exists, so one that turns out to
 * have no tables is deleted again rather than left behind for the next boot to find.
 */
export const readLegacyDatabase = async (): Promise<ListDataState | null> => {
    const db = await openWithoutUpgrade();

    const keys = DataKeys.filter((key) => db.objectStoreNames.contains(getStoreName(key)));
    if (!keys.length) {
        db.close();
        await deleteLegacyDatabase();
        return null;
    }

    const values = await new Promise<unknown[][]>((resolve, reject) => {
        const tx = db.transaction(keys.map(getStoreName), "readonly");
        const requests = keys.map((key) => tx.objectStore(getStoreName(key)).getAll());

        tx.oncomplete = () => resolve(requests.map(({ result }) => result as unknown[]));
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
    db.close();

    const contents = zipObject(keys, values) as unknown as ListDataState;

    // A database with tables but no user was never written to by a session that got as far as
    // saving anything, and there is nothing in it worth preferring to a fresh start
    if (!contents.user?.length) return null;

    return Object.fromEntries(DataKeys.map((key) => [key, contents[key] ?? []])) as unknown as ListDataState;
};

export const deleteLegacyDatabase = () =>
    new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(LEGACY_DATABASE_NAME);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error("Blocked deleting " + LEGACY_DATABASE_NAME));
    });

/**
 * Retention
 *
 * The old database is not removed as soon as its contents have been copied across. It is kept until
 * the new store has been loaded from on ten separate boots spread over at least a fortnight, so that
 * anything that goes wrong in between still has the original to fall back on.
 */
export const MIGRATION_RECORD_KEY = "tophat-legacy-migration";
const BOOTS_BEFORE_DELETION = 10;
const DAYS_BEFORE_DELETION = 14;

export interface MigrationRecord {
    migratedAt: string;
    boots: number;
}

export const getMigrationRecord = (): MigrationRecord | null => {
    const stored = localStorage.getItem(MIGRATION_RECORD_KEY);
    if (!stored) return null;

    try {
        const record = JSON.parse(stored) as MigrationRecord;
        return typeof record?.migratedAt === "string" && typeof record?.boots === "number" ? record : null;
    } catch {
        return null;
    }
};

export const setMigrationRecord = (record: MigrationRecord | null) =>
    record === null
        ? localStorage.removeItem(MIGRATION_RECORD_KEY)
        : localStorage.setItem(MIGRATION_RECORD_KEY, JSON.stringify(record));

/**
 * Counts one more boot that loaded from the new store, and removes the old database once there have
 * been enough of them over enough time. Only ever called from a boot that did load from the new
 * store, so a boot that fell back to the default can never trigger a deletion.
 */
export const recordBootAndMaybeDeleteLegacyDatabase = async () => {
    const record = getMigrationRecord();

    // Either this install never had a legacy database, or it has already been dealt with
    if (record === null) return;

    const boots = record.boots + 1;
    const days = (Date.now() - new Date(record.migratedAt).valueOf()) / (1000 * 60 * 60 * 24);

    if (boots < BOOTS_BEFORE_DELETION || !(days >= DAYS_BEFORE_DELETION)) {
        setMigrationRecord({ ...record, boots });
        return;
    }

    // A deletion blocked by another tab is left for the next boot to try again
    await deleteLegacyDatabase()
        .then(() => setMigrationRecord(null))
        .catch(() => setMigrationRecord({ ...record, boots }));
};
