/**
 * Last-ditch access to a database that TopHat itself can no longer open, used by the recovery
 * screen shown when saved data can't be read.
 *
 * These are written against the raw IndexedDB API rather than Dexie, because the cases they exist
 * for are the ones where Dexie has already refused: a database written by a newer version of the
 * app, or one whose contents no longer match the schema.
 */

import { sum } from "lodash-es";
import { createAndDownloadFile, zipObject } from "../../../shared/data";
import { DATABASE_NAME } from "./database";

/** Opens whatever is in the browser without a version, so that no upgrade is attempted */
const openDatabaseWithoutUpgrade = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DATABASE_NAME);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error(BLOCKED_MESSAGE));
    });

const BLOCKED_MESSAGE = "TopHat is open in another tab, which is still holding on to the data.";

/** Every row still readable out of the database, keyed by table. Dexie's internal tables are left out. */
const readDatabaseContents = async () => {
    const db = await openDatabaseWithoutUpgrade();
    const stores = Array.from(db.objectStoreNames).filter((name) => !name.startsWith("_"));

    const contents = stores.length
        ? await new Promise<Record<string, unknown[]>>((resolve, reject) => {
              const tx = db.transaction(stores, "readonly");
              const requests = stores.map((name) => tx.objectStore(name).getAll());

              tx.oncomplete = () =>
                  resolve(
                      zipObject(
                          stores,
                          requests.map(({ result }) => result as unknown[])
                      )
                  );
              tx.onerror = () => reject(tx.error);
              tx.onabort = () => reject(tx.error);
          })
        : {};

    db.close();
    return contents;
};

let rescued: Record<string, unknown[]> | null = null;

/** Reads what is left of a database that couldn't be loaded, and returns how many rows that was */
export const rescueDatabaseContents = async () => {
    rescued = await readDatabaseContents().catch(() => null);

    return rescued ? sum(Object.values(rescued).map(({ length }) => length)) : 0;
};

/**
 * The rescued rows, as they are stored rather than as TopHat would use them: this is a debug file
 * for a database the app has already failed to make sense of, not something it can import.
 */
export const downloadRescuedDatabaseContents = () =>
    createAndDownloadFile("TopHat Debug Data.json", JSON.stringify(rescued));

export const deleteDatabase = () =>
    new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(DATABASE_NAME);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error(BLOCKED_MESSAGE));
    });
