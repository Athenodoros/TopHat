/**
 * Tests for loading and saving TopHat's data: what a boot makes of whatever is already in
 * IndexedDB, and what ends up back in it as the user changes things. They run against the real
 * storage layer, because the thing worth pinning down is the contract with the data that is already
 * sitting in the browsers of people using the app.
 *
 * @vitest-environment jsdom
 */

import { omit, sum } from "lodash-es";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { DataState, ListDataState } from "../../data";
import { getCurrentMonthString, TransactionHistory } from "../../shared/values";
import {
    Coffee,
    CurrentSchema,
    DataKeys,
    deleteDatabase,
    getMonthsSince,
    getSavedData,
    OldAccount,
    OldCurrency,
    OldGroceries,
    OldGroceriesTransaction,
    OldHousehold,
    OldIncome,
    OldInstitution,
    OldMonth,
    OldNotification,
    OldPatch,
    OldRule,
    OldSalaryTransaction,
    OldSavedData,
    OldStatement,
    OldUser,
    pause,
    readFromDatabase,
    SchemaBeforePatches,
    sortLists,
    waitFor,
    writeToDatabase,
} from "./database.testing";

// A boot also kicks off currency and Dropbox syncs, neither of which is part of what is tested here
vi.mock("../currencies", () => ({ updateSyncedCurrencies: vi.fn(async () => undefined) }));
vi.mock("../dropbox", () => ({
    getMaybeDropboxRedirectCode: vi.fn(() => undefined),
    dealWithDropboxRedirect: vi.fn(),
    maybeSaveDataToDropbox: vi.fn(async () => undefined),
}));

// The app's module graph takes half a minute to load the first time, and a fraction of a second on
// each boot after that. Do it here, at collection time, where the per-test timeout does not apply.
await Promise.all([import("../.."), import("../../data"), import("../startup")]);

/** A fresh page load: a new module registry, and so a new store and new listeners on it */
const bootTopHat = async () => {
    vi.resetModules();

    const [{ TopHatStore, TopHatDispatch }, { DataSlice }, { initialiseAndGetDBConnection }] = await Promise.all([
        import("../.."),
        import("../../data"),
        import("../startup"),
    ]);

    await initialiseAndGetDBConnection();

    return {
        dispatch: TopHatDispatch,
        actions: DataSlice.actions,
        data: () => TopHatStore.getState().data,
        storage: () => TopHatStore.getState().app.storage,
    };
};

/** Redux state as sorted lists, so that it can be compared against the database or the fixtures */
const asLists = (data: DataState) =>
    sortLists(
        Object.fromEntries(DataKeys.map((key) => [key, Object.values(data[key].entities)])) as unknown as ListDataState
    );

// A boot leaves its connection to the database open, the way an open tab would. Wiping the database
// closes them, which logs one DatabaseClosedError per boot from the change subscription being torn
// down - that is teardown noise from dexie-observable, not a failed write.
afterEach(async () => {
    await pause(25); // Saves are fired from a timeout, so let any last one land before wiping
    await deleteDatabase();
});

describe("Loading and saving", () => {
    test("starts in the tutorial state, and saves nothing, when there is no database", async () => {
        const { data, storage } = await bootTopHat();

        expect(storage()).toEqual({ type: "empty" });

        expect(data().user.entities[0]!.tutorial).toBe(true);
        expect(data().account.ids).toEqual([]);
        expect(data().transaction.ids).toEqual([]);

        // The tutorial state is not empty - it holds the placeholder objects that the UI needs
        expect(data().category.ids).toEqual([0, -1]);
        expect(data().institution.ids).toEqual([0]);
        expect(data().currency.entities[1]!.ticker).toBe("AUD");

        // Nothing is written until the user actually changes something
        await pause(25);
        expect(await readFromDatabase()).toEqual(sortLists({}));
    });

    test("saves the whole state the first time anything changes", async () => {
        const { data, dispatch, actions } = await bootTopHat();

        dispatch(actions.updateUserPartial({ tutorial: false }));

        await waitFor(async () => expect(await readFromDatabase()).toEqual(asLists(data())));
    });

    test("loads saved data", async () => {
        await writeToDatabase(getSavedData());

        const { data, storage } = await bootTopHat();

        expect(storage()).toEqual({ type: "loaded" });
        expect(data().user.entities[0]!.tutorial).toBe(false);
        expect(asLists(data())).toEqual(sortLists(getSavedData()));
    });

    test("saves changes, and loads them again on the next boot", async () => {
        await writeToDatabase(getSavedData());

        const first = await bootTopHat();
        first.dispatch(first.actions.updateTransactions([{ id: 1, changes: { reference: "TEA", value: -4 } }]));
        first.dispatch(first.actions.addNewTransaction({ ...Coffee, id: 2, reference: "BOOKS" }));
        await waitFor(async () => expect(await readFromDatabase()).toEqual(asLists(first.data())));

        const second = await bootTopHat();

        expect(second.data().transaction.entities[1]!.reference).toBe("TEA");
        expect(second.data().transaction.entities[2]!.reference).toBe("BOOKS");
        expect(asLists(second.data())).toEqual(asLists(first.data()));
    });

    test("migrates data saved by an older version of the app", async () => {
        // Generation three predates both the cache fixes and the patches added for the rewind feature
        await writeToDatabase(getSavedData({ generation: 3 }));

        const { data } = await bootTopHat();

        expect(data().user.entities[0]!.generation).toBe(5);
        expect(data().patches.ids.length).toBeGreaterThan(0);

        // The summary caches were rebuilt from the transactions, rather than the empty ones loaded
        expect(data().account.entities[1]!.transactions.count).toBe(1);
        expect(data().account.entities[1]!.balances[1].original[0]).toBe(-10);
        expect(data().category.entities[1]!.transactions.count).toBe(1);
        expect(data().currency.entities[1]!.transactions.count).toBe(1);

        // KNOWN BUG - the migrated state is only saved if the user goes on to change something, so a
        // session where they change nothing runs the migration again on every boot. Uncomment to fix.
        // await waitFor(async () => expect(await readFromDatabase()).toEqual(asLists(data())));
    });

    test("upgrades a database written against the older schema", async () => {
        // Schema version one shipped alongside data generation four, and had no patches table
        await writeToDatabase(getSavedData({ generation: 4 }), SchemaBeforePatches);

        const { data, dispatch, actions } = await bootTopHat();

        expect(data().transaction.entities[1]!.reference).toBe("COFFEE");
        expect(data().user.entities[0]!.generation).toBe(5);

        // The upgraded database holds everything, including the patches that generation five adds
        dispatch(actions.updateUserPartial({ alphavantage: "key" }));
        await waitFor(async () => expect(await readFromDatabase()).toEqual(asLists(data())));
        expect((await readFromDatabase()).patches.length).toBeGreaterThan(0);
    });

    test("keeps data that it cannot read, rather than starting over on top of it", async () => {
        // A database written by a later version of the app, which this version has no schema for
        await writeToDatabase(getSavedData(), { ...CurrentSchema, version: CurrentSchema.version + 10 });

        const { data, dispatch, actions, storage } = await bootTopHat();

        const rows = sum(Object.values(getSavedData()).map(({ length }) => length));
        expect(storage()).toEqual({ type: "unreadable", error: expect.any(String), rescuedRows: rows });

        // The app is in the same state it would start a new install in, but nothing is written
        expect(data().user.entities[0]!.tutorial).toBe(true);
        expect(data().transaction.ids).toEqual([]);

        dispatch(actions.updateUserPartial({ tutorial: false }));
        await pause(25);
        expect(await readFromDatabase()).toEqual(sortLists(getSavedData()));
    });

    test("loads every field of data saved months ago", async () => {
        await writeToDatabase(OldSavedData);

        const { data } = await bootTopHat();

        // Optional fields only ever reach the database from a session that filled them in, so this
        // is the only test that says whether they come back out again
        expect(data().institution.entities[1]).toEqual(OldInstitution);
        expect(data().rule.entities[1]).toEqual(OldRule);
        expect(data().statement.entities[1]).toEqual(OldStatement);
        expect(data().user.entities[0]).toEqual(OldUser);
        expect(data().notification.entities[OldNotification.id]).toEqual(OldNotification);

        // Transaction balances are trusted as they were saved, rather than recalculated on load
        expect(data().transaction.entities[1]).toEqual(OldGroceriesTransaction);
        expect(data().transaction.entities[2]).toEqual(OldSalaryTransaction);

        // Account balances are left where they are, unlike the summaries rolled forward below, even
        // though both are read as lists of months counting back from today
        expect(data().account.entities[1]!.balances).toEqual(OldAccount.balances);

        // Everything else is loaded as it was saved, apart from the rolling summary caches below
        const withoutSummary = (entity: object) => omit(entity, "transactions");
        expect(withoutSummary(data().account.entities[1]!)).toEqual(withoutSummary(OldAccount));
        expect(withoutSummary(data().category.entities[1]!)).toEqual(withoutSummary(OldHousehold));
        expect(withoutSummary(data().category.entities[2]!)).toEqual(withoutSummary(OldGroceries));
        expect(withoutSummary(data().category.entities[3]!)).toEqual(withoutSummary(OldIncome));
        expect(withoutSummary(data().currency.entities[1]!)).toEqual(withoutSummary(OldCurrency));

        // The summaries hold the saved values, moved along by the months that have passed since
        const rolled = (values: number[]) => new Array(getMonthsSince(OldMonth)).fill(0).concat(values);
        const expectRolledForward = (loaded: TransactionHistory, saved: TransactionHistory) => {
            expect(loaded.start).toBe(getCurrentMonthString());
            expect(loaded.count).toBe(saved.count);
            expect(loaded.credits).toEqual(rolled(saved.credits));
            expect(loaded.debits).toEqual(rolled(saved.debits));
        };

        expectRolledForward(data().account.entities[1]!.transactions, OldAccount.transactions);
        expectRolledForward(data().category.entities[2]!.transactions, OldGroceries.transactions);
        expectRolledForward(data().category.entities[3]!.transactions, OldIncome.transactions);

        const currency = data().currency.entities[1]!.transactions;
        expectRolledForward(currency, OldCurrency.transactions);
        expect(currency.localCredits).toEqual(rolled(OldCurrency.transactions.localCredits));
        expect(currency.localDebits).toEqual(rolled(OldCurrency.transactions.localDebits));

        /*
         * KNOWN BUG - patches are meant to be pruned once they are thirty days old, but the check
         * compares `diffNow` against a positive number of days, which only ever catches dates in
         * the future. Nothing is pruned, and the history grows for as long as the app is used.
         * Swap these two lines when that is fixed.
         */
        expect(data().patches.entities[OldPatch.id]).toEqual(OldPatch);
        // expect(data().patches.entities[OldPatch.id]).toBeUndefined();
    });

    /*
     * KNOWN BUG - the first save of a session only writes rows, it never removes any, so a deletion
     * made before anything else in the session has been saved stays in the database and is loaded
     * back on the next boot. Uncomment when that is fixed.
     */
    // test("saves a deletion that is the first change of a session", async () => {
    //     await writeToDatabase(getSavedData());
    //
    //     const { data, dispatch, actions } = await bootTopHat();
    //     dispatch(actions.deleteTransactions([1]));
    //
    //     await waitFor(async () => expect(await readFromDatabase()).toEqual(asLists(data())));
    //
    //     const second = await bootTopHat();
    //     expect(second.data().transaction.ids).toEqual([]);
    // });
});
