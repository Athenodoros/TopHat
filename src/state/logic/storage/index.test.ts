/**
 * Tests for loading and saving TopHat's data: what a boot makes of whatever is already in the
 * browser, and what ends up back there as the user changes things. They run against the real
 * storage layer, because the thing worth pinning down is the contract with the data that is already
 * sitting in the browsers of people using the app.
 *
 * There are two places that data can be. The store is where it is saved today. The database left by
 * the Dexie version is read once, on the first boot after the upgrade, and then kept for a while in
 * case that read went wrong - the tests for that are grouped separately below.
 *
 * @vitest-environment jsdom
 */

import { omit, sum } from "lodash-es";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { DataState, ListDataState } from "../../data";
import { getCurrentMonthString, TransactionHistory } from "../../shared/values";
import {
    clearStore,
    Coffee,
    daysAgo,
    DataKeys,
    deleteLegacyDatabase,
    DROPBOX_PATH,
    getDropboxFileContents,
    getLegacyDropboxFileContents,
    getMigrationRecord,
    getMonthsSince,
    getSavedData,
    getNewInstallData,
    legacyDatabaseExists,
    LEGACY_DROPBOX_PATH,
    NoInstitution,
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
    readFromStore,
    SchemaBeforePatches,
    setMigrationRecord,
    StubInstitutions,
    sortLists,
    SYNC_CONFIG_KEY,
    waitFor,
    writeToDatabase,
    writeToStore,
} from "./database.testing";
import { CURRENT_GENERATION } from "./migrations";

// A boot also kicks off a currency sync, which is not part of what is tested here
vi.mock("../currencies", () => ({ updateSyncedCurrencies: vi.fn(async () => undefined) }));

// The app's module graph takes half a minute to load the first time, and a fraction of a second on
// each boot after that. Do it here, at collection time, where the per-test timeout does not apply.
await Promise.all([import("../.."), import("../../data"), import("../startup")]);

/** Every manager a test has booted, so that they can be closed again afterwards */
const booted: { close: () => void }[] = [];

/** A fresh page load: a new module registry, and so a new store, manager and listeners on them */
const bootTopHat = async () => {
    vi.resetModules();

    const [{ TopHatStore, TopHatDispatch }, { DataSlice }, { initialiseAndGetDBConnection }, { getStorageManager }] =
        await Promise.all([import("../.."), import("../../data"), import("../startup"), import("./manager")]);

    await initialiseAndGetDBConnection();

    const boot = {
        dispatch: TopHatDispatch,
        actions: DataSlice.actions,
        data: () => TopHatStore.getState().data,
        storage: () => TopHatStore.getState().app.storage,
        syncs: () => TopHatStore.getState().app.syncs,
        manager: getStorageManager(),
    };

    if (boot.manager) booted.push(boot.manager);
    return boot;
};

/** Redux state as sorted lists, so that it can be compared against what was saved or the fixtures */
const asLists = (data: DataState) =>
    sortLists(
        Object.fromEntries(DataKeys.map((key) => [key, Object.values(data[key].entities)])) as unknown as ListDataState
    );

/**
 * Every fixture with a saved Dropbox token would otherwise set the token migration going, which is
 * only the subject of the last few tests here. Offline is how the app is told to leave it alone.
 */
beforeEach(() => {
    setOnline(false);
    vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL) => {
            throw new Error("Unexpected request: " + input);
        })
    );
});

// Each boot leaves a live manager behind, the way an open tab would. They are closed rather than
// left running, so that a later boot in the same file is not still talking to them.
afterEach(async () => {
    await pause(25); // Saves are fired from a timeout, so let any last one land before wiping
    booted.splice(0).forEach((manager) => manager.close());

    await clearStore();
    await deleteLegacyDatabase();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe("Loading and saving", () => {
    test("starts in the tutorial state when there is nothing saved", async () => {
        const { data, storage } = await bootTopHat();

        expect(storage()).toEqual({ type: "empty" });

        expect(data().user.entities[0]!.tutorial).toBe(true);
        expect(data().account.ids).toEqual([]);
        expect(data().transaction.ids).toEqual([]);

        // The tutorial state is not empty - it holds the placeholder objects that the UI needs
        expect(data().category.ids).toEqual([0, -1]);
        expect(data().institution.ids).toEqual([0]);
        expect(data().currency.entities[1]!.ticker).toBe("AUD");

        // Unlike the Dexie version, a new install is written out rather than left until it changes
        await waitFor(async () => expect(await readFromStore()).toEqual(asLists(data())));
    });

    test("saves the whole state the first time anything changes", async () => {
        const { data, dispatch, actions } = await bootTopHat();

        dispatch(actions.updateUserPartial({ tutorial: false }));

        await waitFor(async () => expect(await readFromStore()).toEqual(asLists(data())));
    });

    test("loads saved data", async () => {
        await writeToStore(getSavedData());

        const { data, storage } = await bootTopHat();

        expect(storage()).toEqual({ type: "loaded" });
        expect(data().user.entities[0]!.tutorial).toBe(false);
        expect(asLists(data())).toEqual(sortLists(getSavedData()));
    });

    test("saves changes, and loads them again on the next boot", async () => {
        await writeToStore(getSavedData());

        const first = await bootTopHat();
        first.dispatch(first.actions.updateTransactions([{ id: 1, changes: { reference: "TEA", value: -4 } }]));
        first.dispatch(first.actions.addNewTransaction({ ...Coffee, id: 2, reference: "BOOKS" }));
        await waitFor(async () => expect(await readFromStore()).toEqual(asLists(first.data())));

        const second = await bootTopHat();

        expect(second.data().transaction.entities[1]!.reference).toBe("TEA");
        expect(second.data().transaction.entities[2]!.reference).toBe("BOOKS");
        expect(asLists(second.data())).toEqual(asLists(first.data()));
    });

    test("saves a deletion that is the first change of a session", async () => {
        await writeToStore(getSavedData());

        const { data, dispatch, actions } = await bootTopHat();
        dispatch(actions.deleteTransactions([1]));

        await waitFor(async () => expect(await readFromStore()).toEqual(asLists(data())));

        const second = await bootTopHat();
        expect(second.data().transaction.ids).toEqual([]);
    });

    test("migrates data saved by an older version of the app", async () => {
        // Generation three predates both the cache fixes and the patches added for the rewind feature
        await writeToStore(getSavedData({ generation: 3 }));

        const { data } = await bootTopHat();

        expect(data().user.entities[0]!.generation).toBe(5);
        expect(data().patches.ids.length).toBeGreaterThan(0);

        // The summary caches were rebuilt from the transactions, rather than the empty ones loaded
        expect(data().account.entities[1]!.transactions.count).toBe(1);
        expect(data().account.entities[1]!.balances[1].original[0]).toBe(-10);
        expect(data().category.entities[1]!.transactions.count).toBe(1);
        expect(data().currency.entities[1]!.transactions.count).toBe(1);

        // The migrated state is saved, rather than run again on every boot until something changes
        await waitFor(async () => expect(await readFromStore()).toEqual(asLists(data())));
    });

    test("keeps data that it cannot read, rather than starting over on top of it", async () => {
        // Data written by a later version of the app, which this version has no migrations for
        const saved = getSavedData({ generation: CURRENT_GENERATION + 1 });
        await writeToStore(saved);

        const { data, dispatch, actions, storage } = await bootTopHat();

        const rows = sum(Object.values(saved).map(({ length }) => length));
        expect(storage()).toEqual({ type: "unreadable", error: expect.any(String), rescuedRows: rows });

        // The app is in the same state it would start a new install in, but nothing is written
        expect(data().user.entities[0]!.tutorial).toBe(true);
        expect(data().transaction.ids).toEqual([]);

        dispatch(actions.updateUserPartial({ tutorial: false }));
        await pause(25);
        expect(await readFromStore()).toEqual(sortLists(saved));
    });

    test("loads every field of data saved months ago", async () => {
        await writeToStore(OldSavedData);

        const { data } = await bootTopHat();

        expectEveryFieldOfOldSavedData(data());
    });

    /**
     * A sync the library has given up on is never written to again, and with polling off nothing
     * clears that. If a failure were remembered across reloads, one of them would stop the app
     * saving for good, without saying so.
     */
    test("goes on saving after a boot whose writes failed", async () => {
        await writeToStore(getSavedData());
        localStorage.setItem(
            SYNC_CONFIG_KEY,
            JSON.stringify([
                {
                    type: "indexeddb",
                    config: JSON.stringify({ compressed: true, desynced: true, target: { id: "tophat" } }),
                },
            ])
        );

        const { data, dispatch, actions, syncs } = await bootTopHat();

        expect(syncs()).toEqual([{ type: "indexeddb", name: undefined, email: undefined, desynced: false }]);

        dispatch(actions.updateUserPartial({ alphavantage: "a-new-key" }));
        await waitFor(async () => expect(await readFromStore()).toEqual(asLists(data())));
    });

    test("picks up a change made in another tab", async () => {
        await writeToStore(getSavedData());

        const first = await bootTopHat();
        const second = await bootTopHat();

        first.dispatch(first.actions.updateTransactions([{ id: 1, changes: { reference: "TEA" } }]));

        await waitFor(() => expect(second.data().transaction.entities[1]!.reference).toBe("TEA"));
        await waitFor(async () => expect(await readFromStore()).toEqual(asLists(first.data())));
    });
});

describe("The database left by the Dexie version", () => {
    test("is loaded, copied into the new store, and left where it is", async () => {
        await writeToDatabase(OldSavedData);

        const { data, storage } = await bootTopHat();

        expect(storage()).toEqual({ type: "loaded" });
        expectEveryFieldOfOldSavedData(data());

        // The copy in the new store is the migrated one, and the original is untouched
        await waitFor(async () => expect(await readFromStore()).toEqual(asLists(data())));
        expect(await readFromDatabase()).toEqual(sortLists(OldSavedData));
        expect(getMigrationRecord()).toEqual({ boots: 1, migratedAt: expect.any(String) });
    });

    test("is read even when it was written against the older schema", async () => {
        // Schema version one shipped alongside data generation four, and had no patches table
        await writeToDatabase(getSavedData({ generation: 4 }), SchemaBeforePatches);

        const { data, storage } = await bootTopHat();

        expect(storage()).toEqual({ type: "loaded" });
        expect(data().transaction.entities[1]!.reference).toBe("COFFEE");
        expect(data().user.entities[0]!.generation).toBe(5);

        await waitFor(async () => expect(await readFromStore()).toEqual(asLists(data())));
        expect((await readFromStore())!.patches.length).toBeGreaterThan(0);
    });

    test("loses to the new store when there is data in both", async () => {
        await writeToDatabase(getSavedData());
        await writeToStore({ ...getSavedData(), transaction: [{ ...Coffee, reference: "NEWER" }] });

        const { data } = await bootTopHat();

        expect(data().transaction.entities[1]!.reference).toBe("NEWER");
        await waitFor(async () => expect(await readFromStore()).toEqual(asLists(data())));

        // Nothing has been copied, so there is nothing to count down to a deletion
        expect((await readFromDatabase()).transaction).toEqual([Coffee]);
        expect(getMigrationRecord()).toBeNull();
    });

    test("is deleted after ten boots spread over a fortnight", async () => {
        await writeToDatabase(getSavedData());
        await writeToStore(getSavedData());
        setMigrationRecord({ migratedAt: daysAgo(20), boots: 8 });

        await bootTopHat();
        expect(getMigrationRecord()!.boots).toBe(9);
        expect(await legacyDatabaseExists()).toBe(true);

        await bootTopHat();
        expect(getMigrationRecord()).toBeNull();
        expect(await legacyDatabaseExists()).toBe(false);
    });

    test("is kept when the boots have not been spread over long enough", async () => {
        await writeToDatabase(getSavedData());
        await writeToStore(getSavedData());
        setMigrationRecord({ migratedAt: daysAgo(2), boots: 9 });

        await bootTopHat();

        expect(getMigrationRecord()!.boots).toBe(10);
        expect(await legacyDatabaseExists()).toBe(true);
    });
});

describe("A Dropbox account linked by the old version", () => {
    const DropboxSpec = { refreshToken: "old-refresh-token", name: "A User", email: "user@example.com" };

    test("becomes a sync target of its own, once", async () => {
        await writeToStore(getSavedData({ dropbox: DropboxSpec }));
        const requests = stubDropbox();

        const first = await bootTopHat();

        await waitFor(() => expect(first.syncs().some((sync) => sync.type === "dropbox")).toBe(true));
        expect(first.syncs().find((sync) => sync.type === "dropbox")).toMatchObject({ email: DropboxSpec.email });
        expect(first.data().user.entities[0]!.dropbox).toBeUndefined();
        expect(localStorage.getItem(SYNC_CONFIG_KEY)).toContain(DropboxSpec.refreshToken);

        // The account is already linked on the next boot, so it is not looked up again
        requests.length = 0;
        await bootTopHat();
        await pause(25);
        expect(requests.filter((url) => url.includes("get_current_account"))).toEqual([]);
    });

    test("is left alone while the browser is offline", async () => {
        await writeToStore(getSavedData({ dropbox: DropboxSpec }));
        const requests = stubDropbox();
        setOnline(false);

        const { data, syncs } = await bootTopHat();
        await pause(25);

        expect(requests).toEqual([]);
        expect(syncs().some((sync) => sync.type === "dropbox")).toBe(false);
        expect(data().user.entities[0]!.dropbox).toEqual(DropboxSpec);
    });
});

/**
 * Linking an account is not simply adding a target: the account may already hold a set of accounts
 * and transactions, and so may the browser. These are the cases where the two disagree.
 */
describe("Linking a Dropbox account", () => {
    test("is refused when the account and the browser both hold real data", async () => {
        await writeToStore(getSavedData());
        const boot = await bootTopHat();

        const remote = getSavedData();
        remote.account = [{ ...remote.account[0], name: "Data From Dropbox" }];
        const link = await linkDropbox(getDropboxFileContents(remote));

        expect(link).toEqual({ type: "conflict" });
        expect(boot.syncs().some((sync) => sync.type === "dropbox")).toBe(false);

        // Refusing the link leaves both sides exactly as they were
        expect(boot.data().account.entities[1]!.name).toBe(getSavedData().account[0].name);
        expect((await readFromStore())!.account[0].name).toBe(getSavedData().account[0].name);
    });

    /**
     * The demo is a full set of accounts and transactions, so it looks like real data from the
     * outside. Linking from a browser showing it used to write it over whatever was in the account.
     */
    test("takes on the account's data when the browser is only showing the demo", async () => {
        await writeToStore(getSavedData({ isDemo: true }));
        const boot = await bootTopHat();

        const remote = getSavedData();
        remote.account = [{ ...remote.account[0], name: "Data From Dropbox" }];
        const link = await linkDropbox(getDropboxFileContents(remote));

        expect(link).toEqual({ type: "linked" });
        await waitFor(() => expect(boot.data().account.entities[1]!.name).toBe("Data From Dropbox"));
    });

    test("reads the backup an older version of TopHat wrote, when there is no newer one", async () => {
        await writeToStore(getSavedData({ isDemo: true }));
        const boot = await bootTopHat();

        const remote = getSavedData();
        remote.account = [{ ...remote.account[0], name: "Data From The Old Backup" }];
        const link = await linkDropbox(null, await getLegacyDropboxFileContents(remote));

        expect(link).toEqual({ type: "linked" });
        await waitFor(() => expect(boot.data().account.entities[1]!.name).toBe("Data From The Old Backup"));

        // The old backup is left where it is, and the data is written to the file synced from here on
        await waitFor(async () => expect((await readFromStore())!.account[0].name).toBe("Data From The Old Backup"));
    });

    /**
     * The lists a new install starts with are not all empty, so counting rows says nothing. Checking
     * only the two that do start empty read two institutions the user had added as an empty install
     * and let the account's data straight over the top of them.
     */
    test("is refused when the browser's only data is in a list that starts with placeholders", async () => {
        await writeToStore({ ...getNewInstallData(), institution: [NoInstitution, ...StubInstitutions] });
        const boot = await bootTopHat();

        const link = await linkDropbox(getDropboxFileContents(getSavedData()));

        expect(link).toEqual({ type: "conflict" });
        expect(boot.data().institution.entities[1]!.name).toBe(StubInstitutions[0].name);
        expect(boot.data().institution.entities[2]!.name).toBe(StubInstitutions[1].name);
    });

    /** The other side of that boundary: an install with only placeholders in it is still disposable */
    test("takes on the account's data when the browser holds only what a new install starts with", async () => {
        await writeToStore(getNewInstallData());
        const boot = await bootTopHat();

        const remote = getSavedData();
        remote.institution = [NoInstitution, ...StubInstitutions];
        const link = await linkDropbox(getDropboxFileContents(remote));

        expect(link).toEqual({ type: "linked" });
        await waitFor(() => expect(boot.data().institution.entities[1]!.name).toBe(StubInstitutions[0].name));
    });

    test("keeps the browser's data when the account holds nothing", async () => {
        await writeToStore(getSavedData());
        const boot = await bootTopHat();

        expect(await linkDropbox(null)).toEqual({ type: "linked" });
        expect(boot.data().account.entities[1]!.name).toBe(getSavedData().account[0].name);
    });

    test("reports an account TopHat has not been given permission to read", async () => {
        await writeToStore(getSavedData());
        await bootTopHat();

        const link = await linkDropbox(null, null, { unauthorised: true });

        expect(link).toMatchObject({ type: "failed" });
        expect((link as { message: string }).message).toContain("permission");
    });

    /** "Something went wrong" is no use to anyone trying to fix their Dropbox app's scopes */
    test("says what Dropbox refused, rather than only that something failed", async () => {
        await writeToStore(getSavedData());
        await bootTopHat();

        const link = await linkDropbox(null, null, { refusal: "missing_scope/files.content.read/..." });

        expect(link).toMatchObject({ type: "failed" });
        expect((link as { message: string }).message).toContain("missing_scope/files.content.read");
    });
});

/**
 * Utilities
 */

/**
 * Runs the link flow against an account holding the given files, with the sign-in popup answered
 * rather than opened. `current` is `/data.json.gz` and `legacy` the `/data.zip` older versions
 * wrote; either may be null, meaning the account does not have that file.
 */
const linkDropbox = async (
    current: ArrayBuffer | null,
    legacy: ArrayBuffer | null = null,
    { unauthorised = false, refusal }: { unauthorised?: boolean; refusal?: string } = {}
) => {
    setOnline(true);

    const files: Record<string, ArrayBuffer | null> = { [DROPBOX_PATH]: current, [LEGACY_DROPBOX_PATH]: legacy };
    const pathOf = (init: RequestInit | undefined) => {
        const body = JSON.parse(String((init?.headers as Record<string, string>)?.["Dropbox-API-Arg"] ?? init?.body));
        return String(body.path);
    };

    // Metadata is looked up by path and the file is then downloaded by revision, so revisions are
    // just the path said twice
    vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<StubbedResponse> => {
            const url = "" + input;

            if (url.includes("oauth2/token")) return json({ access_token: "an-access-token", expires_in: 14400 });
            if (unauthorised) return { ...json({}), status: 401 };

            if (refusal && !url.includes("get_current_account")) return json({ error_summary: refusal });

            if (url.includes("files/get_metadata")) {
                const path = pathOf(init);
                if (!files[path]) return json({ error_summary: "path/not_found/..." });
                return json({ server_modified: new Date().toISOString(), rev: path });
            }

            if (url.includes("files/download")) {
                const contents = files[pathOf(init).replace("rev:", "")];
                return { ...json({}), arrayBuffer: async () => contents! };
            }

            if (url.includes("files/upload")) return json({ server_modified: new Date().toISOString() });

            throw new Error("Unexpected request: " + url);
        })
    );

    const [{ DropboxTarget }, { linkDropboxAccount }] = await Promise.all([
        import("personal-storage-wrapper"),
        import("./dropbox"),
    ]);

    const target = DropboxTarget.deserialise({
        connection: { clientId: "a-client-id", refreshToken: "a-refresh-token", accessToken: "", expiry: daysAgo(1) },
        user: { id: "an-account-id", email: "user@example.com", name: "A User" },
        path: DROPBOX_PATH,
    });
    vi.spyOn(DropboxTarget, "setupInPopup").mockResolvedValue(target);

    return linkDropboxAccount();
};

/**
 * Optional fields only ever reach storage from a session that filled them in, so the fixture that
 * has all of them is the only thing that says whether they come back out again.
 */
const expectEveryFieldOfOldSavedData = (data: DataState) => {
    expect(data.institution.entities[1]).toEqual(OldInstitution);
    expect(data.rule.entities[1]).toEqual(OldRule);
    expect(data.statement.entities[1]).toEqual(OldStatement);
    expect(data.user.entities[0]).toEqual(OldUser);
    expect(data.notification.entities[OldNotification.id]).toEqual(OldNotification);

    // Transaction balances are trusted as they were saved, rather than recalculated on load
    expect(data.transaction.entities[1]).toEqual(OldGroceriesTransaction);
    expect(data.transaction.entities[2]).toEqual(OldSalaryTransaction);

    // Account balances are left where they are, unlike the summaries rolled forward below, even
    // though both are read as lists of months counting back from today
    expect(data.account.entities[1]!.balances).toEqual(OldAccount.balances);

    // Everything else is loaded as it was saved, apart from the rolling summary caches below
    const withoutSummary = (entity: object) => omit(entity, "transactions");
    expect(withoutSummary(data.account.entities[1]!)).toEqual(withoutSummary(OldAccount));
    expect(withoutSummary(data.category.entities[1]!)).toEqual(withoutSummary(OldHousehold));
    expect(withoutSummary(data.category.entities[2]!)).toEqual(withoutSummary(OldGroceries));
    expect(withoutSummary(data.category.entities[3]!)).toEqual(withoutSummary(OldIncome));
    expect(withoutSummary(data.currency.entities[1]!)).toEqual(withoutSummary(OldCurrency));

    // The summaries hold the saved values, moved along by the months that have passed since
    const rolled = (values: number[]) => new Array(getMonthsSince(OldMonth)).fill(0).concat(values);
    const expectRolledForward = (loaded: TransactionHistory, saved: TransactionHistory) => {
        expect(loaded.start).toBe(getCurrentMonthString());
        expect(loaded.count).toBe(saved.count);
        expect(loaded.credits).toEqual(rolled(saved.credits));
        expect(loaded.debits).toEqual(rolled(saved.debits));
    };

    expectRolledForward(data.account.entities[1]!.transactions, OldAccount.transactions);
    expectRolledForward(data.category.entities[2]!.transactions, OldGroceries.transactions);
    expectRolledForward(data.category.entities[3]!.transactions, OldIncome.transactions);

    const currency = data.currency.entities[1]!.transactions;
    expectRolledForward(currency, OldCurrency.transactions);
    expect(currency.localCredits).toEqual(rolled(OldCurrency.transactions.localCredits));
    expect(currency.localDebits).toEqual(rolled(OldCurrency.transactions.localDebits));

    /*
     * KNOWN BUG - patches are meant to be pruned once they are thirty days old, but the check
     * compares `diffNow` against a positive number of days, which only ever catches dates in
     * the future. Nothing is pruned, and the history grows for as long as the app is used.
     * Swap these two lines when that is fixed.
     */
    expect(data.patches.entities[OldPatch.id]).toEqual(OldPatch);
    // expect(data.patches.entities[OldPatch.id]).toBeUndefined();
};

const setOnline = (online: boolean) => vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(online);

/** Answers the handful of Dropbox endpoints that linking an account goes through */
const stubDropbox = () => {
    const requests: string[] = [];
    setOnline(true);

    vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL) => {
            const url = "" + input;
            requests.push(url);

            if (url.includes("oauth2/token")) return json({ access_token: "an-access-token", expires_in: 14400 });
            if (url.includes("get_current_account"))
                return json({
                    account_id: "an-account-id",
                    email: "user@example.com",
                    name: { display_name: "A User" },
                });
            if (url.includes("files/get_metadata")) return json({ error_summary: "path/not_found/..." });
            if (url.includes("files/upload")) return json({ server_modified: new Date().toISOString() });

            throw new Error("Unexpected request: " + url);
        })
    );

    return requests;
};

/** Enough of a Response for the library, which only ever reads the body one of these two ways */
type StubbedResponse = { status?: number; json: () => Promise<unknown>; arrayBuffer: () => Promise<ArrayBuffer> };

const json = (body: unknown): StubbedResponse => ({
    json: async () => body,
    arrayBuffer: async () => new ArrayBuffer(0),
});
