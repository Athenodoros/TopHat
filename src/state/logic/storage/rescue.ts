/**
 * The recovery screen's access to data that TopHat has loaded but cannot read - today, data written
 * by a newer version of the app than the one running.
 *
 * Nothing here writes to storage. The download is a debug file of the data exactly as it was
 * stored, rather than something this version can import, and the deletion is the user's own
 * decision to start again.
 */

import { createAndDownloadFile } from "../../../shared/data";
import type { ListDataState } from "../../data";
import { deleteLegacyDatabase, MIGRATION_RECORD_KEY } from "./legacy";
import { STORAGE_ID, SYNC_CONFIG_KEY } from "./manager";

const STORE_DATABASE_NAME = "personal-storage-wrapper";
const STORE_TABLE_NAME = "stores";

let rescued: ListDataState | null = null;

/** Keeps the data that couldn't be read, so that the recovery screen can offer it as a download */
export const setRescuedContents = (contents: ListDataState) => (rescued = contents);

export const downloadRescuedDatabaseContents = () =>
    createAndDownloadFile("TopHat Debug Data.json", JSON.stringify(rescued));

/**
 * Everything TopHat has put in this browser: the row in the store, the database the Dexie version
 * wrote, and the two keys in local storage. The refresh token for a linked Dropbox account is one
 * of those keys, so it has to go with the rest.
 */
export const deleteAllStoredData = async () => {
    await clearStoreRow();
    await deleteLegacyDatabase();

    localStorage.removeItem(SYNC_CONFIG_KEY);
    localStorage.removeItem(MIGRATION_RECORD_KEY);
};

/**
 * The row is cleared rather than the database deleted, because the manager is holding a connection
 * to it and a delete would sit blocked behind that for as long as the tab is open.
 */
const clearStoreRow = () =>
    new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(STORE_DATABASE_NAME);

        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error("TopHat is open in another tab, which still holds the data."));
        request.onsuccess = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_TABLE_NAME)) {
                db.close();
                return resolve();
            }

            const tx = db.transaction([STORE_TABLE_NAME], "readwrite");
            tx.objectStore(STORE_TABLE_NAME).delete(STORAGE_ID);
            tx.oncomplete = () => {
                db.close();
                resolve();
            };
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        };
    });
