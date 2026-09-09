/**
 * Tests for loading and saving TopHat's data: what a boot makes of whatever is already in
 * IndexedDB, and what ends up back in it as the user changes things. They run against the real
 * storage layer, because the thing worth pinning down is the contract with the data that is already
 * sitting in the browsers of people using the app.
 *
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, test, vi } from "vitest";
import type { DataState, ListDataState } from "../../data";
import {
    Coffee,
    DataKeys,
    deleteDatabase,
    getSavedData,
    pause,
    readFromDatabase,
    SchemaBeforePatches,
    sortLists,
    updateFromAnotherTab,
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

    return { dispatch: TopHatDispatch, actions: DataSlice.actions, data: () => TopHatStore.getState().data };
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
        const { data } = await bootTopHat();

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

        const { data } = await bootTopHat();

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

    test("picks up changes written by another tab", async () => {
        await writeToDatabase(getSavedData());

        const { data } = await bootTopHat();
        expect(data().institution.entities[0]!.name).toBe("No Institution");

        await updateFromAnotherTab({ institution: [{ id: 0, name: "Renamed Elsewhere", colour: "#757575" }] });

        await waitFor(() => expect(data().institution.entities[0]!.name).toBe("Renamed Elsewhere"));
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
