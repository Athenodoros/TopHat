/**
 * Tests for the raw IndexedDB utilities in `database.testing.ts`, which the persistence tests in
 * `index.test.ts` are built on. They read and write the database through the browser API, so these
 * check that they agree with what Dexie writes today.
 *
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, test } from "vitest";
import {
    CurrentSchema,
    DATABASE_NAME,
    deleteDatabase,
    getSavedData,
    readFromDatabase,
    SchemaBeforePatches,
    sortLists,
    updateFromAnotherTab,
    waitFor,
    writeToDatabase,
} from "./database.testing";

/** Read the database without going through the utilities, so that they are not their own witness */
const readRawDatabase = async (store?: string) =>
    new Promise<{ version: number; stores: string[]; rows: unknown[] }>((resolve, reject) => {
        const request = indexedDB.open(DATABASE_NAME);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const stores = Array.from(db.objectStoreNames);
            const summary = { version: db.version, stores, rows: [] as unknown[] };

            if (!store || !stores.includes(store)) {
                db.close();
                return resolve(summary);
            }

            const rows = db.transaction(store, "readonly").objectStore(store).getAll();
            rows.onsuccess = () => {
                db.close();
                resolve({ ...summary, rows: rows.result });
            };
            rows.onerror = () => reject(rows.error);
        };
    });

const EmptyDatabase = sortLists({});

afterEach(() => deleteDatabase());

describe("The test database utilities", () => {
    test("write and read back saved data", async () => {
        await writeToDatabase(getSavedData());

        expect(await readFromDatabase()).toEqual(sortLists(getSavedData()));
    });

    test("write the schema that the app expects", async () => {
        await writeToDatabase(getSavedData());

        const { version, stores } = await readRawDatabase();
        expect(version).toBe(CurrentSchema.version);
        expect(stores.sort()).toEqual(CurrentSchema.stores.map(({ name }) => name).sort());
    });

    test("read an empty database as empty tables", async () => {
        expect(await readFromDatabase()).toEqual(EmptyDatabase);
    });

    test("delete the database", async () => {
        await writeToDatabase(getSavedData());
        await deleteDatabase();

        expect(await readFromDatabase()).toEqual(EmptyDatabase);
    });

    test("write the older schema, without the patches table", async () => {
        await writeToDatabase(getSavedData(), SchemaBeforePatches);

        const { version, stores } = await readRawDatabase();
        expect(version).toBe(SchemaBeforePatches.version);
        expect(stores).not.toContain("patches");
        expect((await readFromDatabase()).transaction).toHaveLength(1);
    });

    test("write another tab's changes to both the data and the change log", async () => {
        await writeToDatabase(getSavedData());

        const revision = await updateFromAnotherTab({
            institution: [{ id: 0, name: "Renamed Elsewhere", colour: "#757575" }],
        });

        expect((await readFromDatabase()).institution[0].name).toBe("Renamed Elsewhere");

        const { rows } = await readRawDatabase("_changes");
        expect(rows).toEqual([
            { rev: revision, source: "another-tab", type: 2, table: "institution", key: 0, mods: expect.anything() },
        ]);
        expect(localStorage.getItem("Dexie.Observable/latestRevision/" + DATABASE_NAME)).toBe("" + revision);
    });

    test("wait for an assertion that only passes later", async () => {
        const start = Date.now();
        const isDone = () => expect(Date.now() - start).toBeGreaterThan(50);

        await waitFor(isDone);
        await expect(waitFor(() => expect(false).toBe(true), 50)).rejects.toThrow();
    });
});
