/**
 * Last-ditch access to a database that TopHat itself can no longer open, used by the recovery
 * screen shown when saved data can't be read.
 *
 * These go through the raw IndexedDB reads in `legacy/index.ts` rather than Dexie, because the cases
 * they exist for are the ones where Dexie has already refused: a database written by a newer version
 * of the app, or one whose contents no longer match the schema.
 */

import { sum } from "lodash-es";
import { createAndDownloadFile } from "../../../shared/data";
import { deleteLegacyDatabase, readLegacyTables } from "./legacy";

let rescued: Record<string, unknown[]> | null = null;

/** Reads what is left of a database that couldn't be loaded, and returns how many rows that was */
export const rescueDatabaseContents = async () => {
    rescued = await readLegacyTables().catch(() => null);

    return rescued ? sum(Object.values(rescued).map(({ length }) => length)) : 0;
};

/**
 * The rescued rows, as they are stored rather than as TopHat would use them: this is a debug file
 * for a database the app has already failed to make sense of, not something it can import.
 */
export const downloadRescuedDatabaseContents = () =>
    createAndDownloadFile("TopHat Debug Data.json", JSON.stringify(rescued));

export const deleteDatabase = deleteLegacyDatabase;
