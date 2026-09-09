/**
 * Tests for the raw IndexedDB utilities in `database.testing.ts`, which the persistence tests in
 * `index.test.ts` are built on. They check the utilities against the code that really writes each
 * of the two places data can be: personal-storage-wrapper for the store, and the legacy reader for
 * the database the Dexie version left behind.
 *
 * What this file is here for is the confidence that the utilities the other tests rely on describe
 * the real thing, rather than agreeing with themselves.
 *
 * @vitest-environment jsdom
 */

// The in-memory implementation has to be installed before a test file pulls in any of the app
import "fake-indexeddb/auto";

import { PersonalStorageManager } from "personal-storage-wrapper";
import { afterEach, describe, expect, test } from "vitest";
import type { ListDataState } from "../../data";
import {
    clearStore,
    CurrentSchema,
    deleteLegacyDatabase,
    getSavedData,
    legacyDatabaseExists,
    readFromStore,
    SchemaBeforePatches,
    sortLists,
    writeToDatabase,
    writeToStore,
} from "./database.testing";
import { readLegacyDatabase } from "./legacy";
import { getDefaultSyncs, getSyncData, saveSyncData, STORAGE_ID } from "./manager";

// Held open for the length of a test, the way a boot of the app would hold them
const managers: PersonalStorageManager<ListDataState>[] = [];
const openManager = async () => {
    const manager = await PersonalStorageManager.create<ListDataState>(() => sortLists({}), {
        id: STORAGE_ID + "-" + managers.length,
        getSyncData,
        saveSyncData,
        getDefaultSyncs,
        pollPeriodInSeconds: null,
    });

    managers.push(manager);
    return manager;
};

afterEach(async () => {
    managers.splice(0).forEach((manager) => manager.close());
    await clearStore();
    await deleteLegacyDatabase();
});

describe("The test store utilities", () => {
    test("write a row that the app reads back as the data it was given", async () => {
        await writeToStore(getSavedData());

        const manager = await openManager();

        expect(sortLists(manager.getValue())).toEqual(sortLists(getSavedData()));
    });

    test("read the row that the app writes", async () => {
        const manager = await openManager();
        await manager.setValue(sortLists(getSavedData()));

        expect(await readFromStore()).toEqual(sortLists(getSavedData()));
    });

    test("read nothing at all when the app has saved nothing", async () => {
        expect(await readFromStore()).toBeNull();
    });
});

describe("The legacy database reader", () => {
    test("reads a database written against the schema Dexie last used", async () => {
        await writeToDatabase(getSavedData(), CurrentSchema);

        expect(sortLists((await readLegacyDatabase())!)).toEqual(sortLists(getSavedData()));
    });

    test("reads a database written against the older schema", async () => {
        await writeToDatabase(getSavedData(), SchemaBeforePatches);

        expect(sortLists((await readLegacyDatabase())!)).toEqual(sortLists(getSavedData()));
    });

    test("reads nothing, and leaves nothing behind, when there is no database", async () => {
        expect(await readLegacyDatabase()).toBeNull();

        // Opening a database that isn't there creates an empty one, which has to go again
        expect(await legacyDatabaseExists()).toBe(false);
    });
});
