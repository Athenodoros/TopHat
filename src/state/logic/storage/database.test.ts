/**
 * Checks against Dexie itself, which is what writes the database today, of the three things that
 * rely on how it behaves once it is gone:
 *
 * - The app's legacy reader in `legacy/index.ts`, which the migration will copy users' data with:
 *   that it reads what Dexie has written, and relies only on things Dexie really does.
 * - The raw fixture writes in `legacy/fixtures.testing.ts`, which every other persistence test sets
 *   up its data with: that they leave the database Dexie would have left.
 * - The lock on the old database: that Dexie versions of the app can neither open nor write to it.
 *
 * This whole file goes when Dexie does. After that, these are the only evidence that the reader
 * and the fixtures describe the real thing.
 *
 * @vitest-environment jsdom
 */

// Dexie reads `indexedDB` off the global when it is first imported, so this has to come first here
import "fake-indexeddb/auto";

import { afterEach, describe, expect, test } from "vitest";
import type { ListDataState } from "../../data";
import { TopHatDexie } from "./database";
import { deleteLegacyDatabase, lockLegacyDatabase, readLegacyDatabase, readLegacyTables } from "./legacy";
import {
    getSavedData,
    LegacySchema,
    LegacySchemaBeforePatches,
    readFromLegacyDatabase,
    sortLists,
    writeToLegacyDatabase,
} from "./legacy/fixtures.testing";

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

// The data tables under the names Dexie gives them, without the ones dexie-observable adds
const DataTables = [
    "account",
    "category",
    "currency",
    "institution",
    "rule",
    "transaction_",
    "statement",
    "user",
    "notification",
    "patches",
];

afterEach(async () => {
    connections.splice(0).forEach((db) => db.close());
    await deleteLegacyDatabase();
});

describe("The legacy reader, against Dexie", () => {
    test("reads what Dexie has written", async () => {
        const db = await openWithDexie();
        await writeWithDexie(db, getSavedData());

        expect(await readFromLegacyDatabase()).toEqual(sortLists(getSavedData()));
    });

    test("reads the data tables Dexie creates, and leaves out Dexie's own", async () => {
        const db = await openWithDexie();
        await writeWithDexie(db, getSavedData());

        // dexie-observable's bookkeeping tables are in the database, and hold rows
        expect(db.tables.filter(({ name }) => name.startsWith("_")).length).toBeGreaterThan(0);
        expect(await db.table("_changes").count()).toBeGreaterThan(0);

        expect(Object.keys((await readLegacyTables())!).sort()).toEqual([...DataTables].sort());
    });

    test("reads a database Dexie has opened but never written to as nothing", async () => {
        await openWithDexie();

        // Dexie creates every table on its first open, which is why empty tables mean a fresh install
        expect(await readLegacyTables()).toEqual(Object.fromEntries(DataTables.map((name) => [name, []])));
        expect(await readLegacyDatabase()).toBeNull();
    });

    test("deletes a database Dexie has written", async () => {
        const db = await openWithDexie();
        await writeWithDexie(db, getSavedData());
        db.close();

        await deleteLegacyDatabase();

        expect(await readLegacyTables()).toBeNull();
    });
});

describe("The lock, against Dexie", () => {
    test("stops Dexie opening the database", async () => {
        await writeToLegacyDatabase(getSavedData());

        await lockLegacyDatabase();

        await expect(openWithDexie()).rejects.toMatchObject({ name: "VersionError" });
    });

    test("stops a tab that already has it open from writing to it", async () => {
        const db = await openWithDexie();
        await writeWithDexie(db, getSavedData());

        await lockLegacyDatabase();

        await expect(db.user.put({ ...getSavedData().user[0], tutorial: true })).rejects.toThrow();
        expect(await readFromLegacyDatabase()).toEqual(sortLists(getSavedData()));
    });
});

describe("The fixtures, against Dexie", () => {
    test("write a database that Dexie opens as it stands", async () => {
        await writeToLegacyDatabase(getSavedData());

        const db = await openWithDexie();

        // Dexie found the schema it expects, rather than upgrading the database to get it
        expect(db.verno).toBe(2);
        expect(db.backendDB().version).toBe(LegacySchema.version);
        expect(await readWithDexie(db)).toEqual(sortLists(getSavedData()));
    });

    test("write the older schema, which Dexie upgrades", async () => {
        await writeToLegacyDatabase(getSavedData(), LegacySchemaBeforePatches);

        const db = await openWithDexie();

        expect(db.backendDB().version).toBe(LegacySchema.version);
        expect(await db.patches.toArray()).toEqual([]);
        expect(await readWithDexie(db)).toEqual(sortLists(getSavedData()));
    });
});
