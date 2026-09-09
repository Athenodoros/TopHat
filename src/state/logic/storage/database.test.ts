/**
 * Tests for the raw IndexedDB utilities in `database.testing.ts`, which the persistence tests in
 * `index.test.ts` are built on. They check the utilities against Dexie, which is what writes the
 * database today: that they read what it has written, that what they write is a database it opens
 * as it stands, and that another tab's changes reach a connection of its own.
 *
 * This whole file goes when Dexie does. What it is here for is the confidence that the utilities
 * the other tests rely on describe the real thing.
 *
 * @vitest-environment jsdom
 */

// Dexie reads `indexedDB` off the global when it is first imported, so this has to come first here
import "fake-indexeddb/auto";

import { afterEach, describe, expect, test } from "vitest";
import type { ListDataState } from "../../data";
import { TopHatDexie } from "./database";
import {
    CurrentSchema,
    deleteDatabase,
    getSavedData,
    readFromDatabase,
    SchemaBeforePatches,
    sortLists,
    updateFromAnotherTab,
    waitFor,
    writeToDatabase,
} from "./database.testing";

// Connections are held open for the length of a test, the way a tab would hold one
const connections: TopHatDexie[] = [];
const openWithDexie = async () => {
    const db = new TopHatDexie();
    await db.open();
    connections.push(db);
    return db;
};

// Spelled out rather than looped over, so that this file says what the Dexie schema looks like
const writeWithDexie = (db: TopHatDexie, data: ListDataState) =>
    Promise.all([
        db.account.bulkPut(data.account),
        db.category.bulkPut(data.category),
        db.currency.bulkPut(data.currency),
        db.institution.bulkPut(data.institution),
        db.rule.bulkPut(data.rule),
        db.transaction_.bulkPut(data.transaction),
        db.statement.bulkPut(data.statement),
        db.user.bulkPut(data.user),
        db.notification.bulkPut(data.notification),
        db.patches.bulkPut(data.patches),
    ]);

const readWithDexie = async (db: TopHatDexie) =>
    sortLists({
        account: await db.account.toArray(),
        category: await db.category.toArray(),
        currency: await db.currency.toArray(),
        institution: await db.institution.toArray(),
        rule: await db.rule.toArray(),
        transaction: await db.transaction_.toArray(),
        statement: await db.statement.toArray(),
        user: await db.user.toArray(),
        notification: await db.notification.toArray(),
        patches: await db.patches.toArray(),
    });

const EmptyDatabase = sortLists({});

afterEach(async () => {
    connections.splice(0).forEach((db) => db.close());
    await deleteDatabase();
});

describe("The test database utilities", () => {
    test("read what Dexie has written", async () => {
        const db = await openWithDexie();
        await writeWithDexie(db, getSavedData());

        expect(await readFromDatabase()).toEqual(sortLists(getSavedData()));
    });

    test("write a database that Dexie opens as it stands", async () => {
        await writeToDatabase(getSavedData());

        const db = await openWithDexie();

        // Dexie found the schema it expects, rather than upgrading the database to get it
        expect(db.verno).toBe(2);
        expect(db.backendDB().version).toBe(CurrentSchema.version);
        expect(await readWithDexie(db)).toEqual(sortLists(getSavedData()));
    });

    test("write the older schema, which Dexie upgrades", async () => {
        await writeToDatabase(getSavedData(), SchemaBeforePatches);

        const db = await openWithDexie();

        expect(db.backendDB().version).toBe(CurrentSchema.version);
        expect(await db.patches.toArray()).toEqual([]);
        expect(await readWithDexie(db)).toEqual(sortLists(getSavedData()));
    });

    test("read an empty database as empty tables", async () => {
        expect(await readFromDatabase()).toEqual(EmptyDatabase);

        await openWithDexie();
        expect(await readFromDatabase()).toEqual(EmptyDatabase);
    });

    test("delete the database", async () => {
        const db = await openWithDexie();
        await writeWithDexie(db, getSavedData());
        db.close();

        await deleteDatabase();

        expect(await readFromDatabase()).toEqual(EmptyDatabase);
    });

    test("reach an open connection with another tab's changes", async () => {
        const db = await openWithDexie();
        const changes: { source?: string; table: string }[] = [];
        db.on("changes", (received) => void changes.push(...received));

        await updateFromAnotherTab({ institution: [{ id: 0, name: "Written Elsewhere", colour: "#757575" }] });

        await waitFor(() => expect(changes.map(({ source }) => source)).toContain("another-tab"));
        expect(changes.map(({ table }) => table)).toContain("institution");
        expect(await db.institution.toArray()).toEqual([{ id: 0, name: "Written Elsewhere", colour: "#757575" }]);
    });

    test("wait for an assertion that only passes later", async () => {
        const start = Date.now();
        const isDone = () => expect(Date.now() - start).toBeGreaterThan(50);

        await waitFor(isDone);
        await expect(waitFor(() => expect(false).toBe(true), 50)).rejects.toThrow();
    });
});
