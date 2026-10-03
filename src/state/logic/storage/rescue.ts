/**
 * The recovery screen's access to data that TopHat has found but cannot use: a store it can't
 * decode, data with no user in it or written by a newer version of the app, or a database left by
 * the Dexie version of the app that can't be read.
 *
 * Nothing here writes to either store. The download is a debug file of whatever could be read,
 * rather than something the app can import, and the deletion is the user's own decision to start
 * again.
 */

import { sum } from "lodash-es";
import { createAndDownloadFile } from "../../../shared/data";
import { deleteLegacyDatabase, readLegacyTables, setMigrationRecord } from "./legacy";
import { clearStore, UnusableContents } from "./store";

interface RescuedContents {
    /** The store's value, where it could be decoded, or its bytes as base64 where it couldn't */
    store: unknown;
    /** Every table of the old database, as it is stored */
    legacy: Record<string, unknown[]> | null;
}

let rescued: RescuedContents = { store: null, legacy: null };

/**
 * Keeps whatever could be read from both stores for the download, and returns how many rows that
 * was. A value in the store that couldn't be decoded counts as the one row it is saved in.
 */
export const rescueStorageContents = async (store: UnusableContents | null): Promise<number> => {
    const legacy = await readLegacyTables().catch(() => null);
    rescued = {
        store: store === null ? null : store.type === "value" ? store.value : store.raw && toBase64(store.raw),
        legacy,
    };

    const legacyRows = legacy ? sum(Object.values(legacy).map(({ length }) => length)) : 0;
    return countStoreRows(rescued.store) + legacyRows;
};

export const downloadRescuedDatabaseContents = () =>
    createAndDownloadFile("TopHat Debug Data.json", JSON.stringify(rescued));

/**
 * Everything TopHat has saved in this browser: the old database, the store's row, the store's list
 * of targets and the record of the copy between them.
 *
 * The old database goes first, since another tab can hold up its deletion. Like `deleteLegacyDatabase`,
 * this then waits rather than failing, and tells `onStillBlocked` so; the rest follows once it is gone.
 */
export const deleteDatabase = async (onStillBlocked: (error: Error) => void) => {
    await deleteLegacyDatabase(onStillBlocked);
    await clearStore();
    setMigrationRecord(null);
};

const countStoreRows = (value: unknown): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value !== "object") return 1;

    return sum(Object.values(value).map((rows) => (Array.isArray(rows) ? rows.length : 0))) || 1;
};

const toBase64 = (buffer: ArrayBuffer) => {
    let binary = "";
    new Uint8Array(buffer).forEach((byte) => (binary += String.fromCharCode(byte)));
    return btoa(binary);
};
