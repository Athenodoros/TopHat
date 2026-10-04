/**
 * Tests for syncing to Dropbox: linking an account and deciding whose data to keep, moving over the
 * link an earlier version of TopHat made, and what happens when Dropbox or the browser can't be
 * reached. They boot the whole app against an in-memory IndexedDB and a fake of Dropbox's API, since
 * what matters is what ends up in each place.
 *
 * @vitest-environment jsdom
 */

// The in-memory implementation has to be installed before anything opens a database
import "fake-indexeddb/auto";

import { afterAll, afterEach, describe, expect, test, vi } from "vitest";
import { getInitialTutorialLists, type ListDataState } from "../../data";
import type { Institution } from "../../data/types";
import { bootTopHat, closeOpenManagers, loadTopHat, pause, startBootingTopHat, waitFor } from "./boot.testing";
import {
    ACCOUNT,
    DROPBOX_FILE,
    installFakeDropbox,
    LEGACY_DROPBOX_FILE,
    REFRESH_TOKEN,
    setOnline,
} from "./dropbox.testing";
import {
    closeTestBroadcastChannels,
    deleteStore,
    installTestBroadcastChannel,
    readFromStore,
    readRawFromStore,
    SYNC_CONFIG_KEY,
    writeToStore,
} from "./fixtures.testing";
import { deleteLegacyDatabase } from "./legacy";
import { Coffee, getSavedData, OldInstitution } from "./legacy/fixtures.testing";
import type { StorageState } from "./types";

// Boot also syncs currencies, which isn't part of what is tested here
vi.mock("../currencies", () => ({ updateSyncedCurrencies: vi.fn(async () => undefined) }));

installTestBroadcastChannel();
const dropbox = installFakeDropbox();
afterAll(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

await loadTopHat();

afterEach(async () => {
    await pause(25); // Saves are fired from a timeout, so let any last one land before wiping
    vi.useRealTimers();

    // A closed manager's requests that were already under way still finish, and must not reach the next test's Dropbox
    closeOpenManagers();
    await pause(25);
    closeTestBroadcastChannels();
    await deleteLegacyDatabase();
    await deleteStore();
    localStorage.clear();
    dropbox.reset();
});

/** The app's own functions, from the module registry of the boot that just ran */
const getDropbox = () => import("./dropbox");
const getNotifications = () => import("../notifications/types");

/** The same saved data, told apart by the reference of its one transaction */
const withReference = (reference: string): ListDataState => ({
    ...getSavedData(),
    transaction: [{ ...Coffee, reference }],
});

const getReference = (value: ListDataState | null) => value?.transaction[0]?.reference;

/** The types of the targets in the saved list, in order */
const readSavedTargetTypes = () =>
    (JSON.parse(localStorage.getItem(SYNC_CONFIG_KEY) ?? "[]") as { type: string }[]).map(({ type }) => type);

/** Boots on saved data, and links the account */
const bootAndLink = async (saved: ListDataState | null = getSavedData()) => {
    if (saved) await writeToStore(saved);
    const tab = await bootTopHat();
    const outcome = await (await getDropbox()).linkDropboxAccount();
    return { ...tab, outcome };
};

describe("Linking an account", () => {
    test("uploads the browser's data to an empty account, and syncs every change after", async () => {
        const { outcome, dispatch, actions, remotes } = await bootAndLink(withReference("BROWSER"));

        expect(outcome).toEqual({ type: "linked", kept: "browser" });
        expect(getReference(dropbox.readValue())).toBe("BROWSER");
        expect(readSavedTargetTypes()).toEqual(["indexeddb", "dropbox"]);
        expect(remotes()).toEqual([
            {
                type: "dropbox",
                account: { name: ACCOUNT.name.display_name, email: ACCOUNT.email },
                inStep: true,
                failing: false,
            },
        ]);

        dispatch(actions.updateTransactions([{ id: 1, changes: { reference: "CHANGED" } }]));
        await waitFor(() => expect(getReference(dropbox.readValue())).toBe("CHANGED"));
        expect(getReference(await readFromStore())).toBe("CHANGED");
    });

    test.each([
        ["only the tutorial", null],
        ["only the demo", getSavedData({ isDemo: true })],
    ])("takes the account's data when the browser holds %s", async (_, browser) => {
        dropbox.putValue(withReference("DROPBOX"));

        const { outcome, data } = await bootAndLink(browser);

        expect(outcome).toEqual({ type: "linked", kept: "dropbox" });
        expect(data().transaction.entities[1]!.reference).toBe("DROPBOX");
        expect(data().user.entities[0]!.tutorial).toBe(false);
        await waitFor(async () => expect(getReference(await readFromStore())).toBe("DROPBOX"));
        expect(getReference(dropbox.readValue())).toBe("DROPBOX");
    });

    test("replaces only the tutorial or demo in the account with the browser's data", async () => {
        dropbox.putValue(getSavedData({ isDemo: true }));

        const { outcome } = await bootAndLink(withReference("BROWSER"));

        expect(outcome).toEqual({ type: "linked", kept: "browser" });
        await waitFor(() => expect(getReference(dropbox.readValue())).toBe("BROWSER"));
    });

    test("refuses, and changes nothing on either side, when both hold data of the user's own", async () => {
        dropbox.putValue(withReference("DROPBOX"));
        await writeToStore(withReference("BROWSER"));
        const before = { browser: await readRawFromStore(), dropbox: dropbox.files.get(DROPBOX_FILE) };

        const { outcome, data } = await bootAndLink(null);

        expect(outcome).toEqual({ type: "refused" });
        expect(data().transaction.entities[1]!.reference).toBe("BROWSER");
        await pause(25);
        expect(await readRawFromStore()).toEqual(before.browser);
        expect(dropbox.files.get(DROPBOX_FILE)).toEqual(before.dropbox);
        expect(readSavedTargetTypes()).toEqual(["indexeddb"]);
    });

    /** A new install has a placeholder institution already, so having institutions says nothing by itself */
    test("counts a browser whose only data of the user's own is an institution as holding real data", async () => {
        dropbox.putValue(withReference("DROPBOX"));
        const tutorial = getInitialTutorialLists();
        const browser = {
            ...tutorial,
            user: [{ ...(tutorial.user[0] as object), tutorial: false }],
            institution: [...tutorial.institution, { ...OldInstitution, id: 99 } as Institution],
        } as ListDataState;

        const { outcome } = await bootAndLink(browser);

        expect(outcome).toEqual({ type: "refused" });
        expect(getReference(dropbox.readValue())).toBe("DROPBOX");
    });

    test("takes the backup an earlier version left, when the account has nothing newer, and leaves it there", async () => {
        await dropbox.putLegacyBackup(withReference("LEGACY"));
        const backup = dropbox.files.get(LEGACY_DROPBOX_FILE);

        const { outcome, data } = await bootAndLink(null);

        expect(outcome).toEqual({ type: "linked", kept: "dropbox" });
        expect(data().transaction.entities[1]!.reference).toBe("LEGACY");
        await waitFor(() => expect(getReference(dropbox.readValue())).toBe("LEGACY"));
        expect(dropbox.files.get(LEGACY_DROPBOX_FILE)).toEqual(backup);
    });

    test("prefers the file it syncs to over a stale backup from an earlier version", async () => {
        await dropbox.putLegacyBackup(withReference("STALE"));
        dropbox.putValue(withReference("CURRENT"));

        const { outcome, data } = await bootAndLink(null);

        expect(outcome).toEqual({ type: "linked", kept: "dropbox" });
        expect(data().transaction.entities[1]!.reference).toBe("CURRENT");
    });

    test("says so, and links nothing, when the sign-in is cancelled", async () => {
        dropbox.code = null;

        const { outcome } = await bootAndLink();

        expect(outcome).toEqual({ type: "cancelled" });
        expect(readSavedTargetTypes()).toEqual(["indexeddb"]);
    });

    test.each([
        [
            "a code it won't exchange",
            () => (dropbox.codeRefused = true),
            /could not sign in to Dropbox\. Dropbox didn't accept the sign-in.*code doesn't exist or has expired/,
        ],
        [
            "a missing permission",
            () => dropbox.missingScope.add("files/get_metadata"),
            /Dropbox refused the account.*missing_scope/,
        ],
        [
            "data from a newer version of TopHat",
            () => dropbox.putValue(getSavedData({ generation: 99 })),
            /can't be used.*newer version/,
        ],
    ])("links nothing, and says what Dropbox said, given %s", async (_, setUp, message) => {
        setUp();

        const { outcome } = await bootAndLink();

        expect(outcome).toEqual({ type: "failed", message: expect.stringMatching(message) });
        expect(readSavedTargetTypes()).toEqual(["indexeddb"]);
    });

    test("removes a link an earlier version made, which a linked account makes redundant", async () => {
        const { outcome, data } = await bootAndLink(
            getSavedData({ dropbox: { refreshToken: "elsewhere", name: "A User", email: "user@example.com" } })
        );

        expect(outcome).toEqual({ type: "linked", kept: "browser" });
        expect(data().user.entities[0]!.dropbox).toBeUndefined();
        await waitFor(() => expect(dropbox.readValue()?.user[0]).not.toHaveProperty("dropbox"));
    });
});

describe("Unlinking", () => {
    test("stops syncing, and leaves what is in both places as it was", async () => {
        const { dispatch, actions, remotes } = await bootAndLink(withReference("BROWSER"));

        await (await getDropbox()).unlinkDropbox();
        expect(remotes()).toEqual([]);
        expect(readSavedTargetTypes()).toEqual(["indexeddb"]);

        dispatch(actions.updateTransactions([{ id: 1, changes: { reference: "CHANGED" } }]));
        await waitFor(async () => expect(getReference(await readFromStore())).toBe("CHANGED"));
        expect(getReference(dropbox.readValue())).toBe("BROWSER");
    });
});

describe("Changes made on another device", () => {
    test("are taken on the next poll, when nothing has changed here", async () => {
        const { data } = await bootAndLink(withReference("BROWSER"));

        dropbox.putValue(withReference("OTHER"));
        await (window as any).connection.manager.poll(); // The library's timer polls once a minute

        expect(data().transaction.entities[1]!.reference).toBe("OTHER");
        await waitFor(async () => expect(getReference(await readFromStore())).toBe("OTHER"));
    });

    test("are never written over by a save here: both copies changed, so the user chooses", async () => {
        const { dispatch, actions, storage, data } = await bootAndLink(withReference("BROWSER"));

        dropbox.putValue(withReference("OTHER"));
        dispatch(actions.updateTransactions([{ id: 1, changes: { reference: "HERE" } }]));

        await waitFor(() => expect(storage()).toMatchObject({ type: "conflict" }));
        expect(getReference(dropbox.readValue())).toBe("OTHER");

        // Keeping this browser's copy sends it to Dropbox
        const { chooseStorageCopy } = await import("./index");
        const copies = (storage() as StorageState & { type: "conflict" }).copies;
        await chooseStorageCopy(copies.find(({ source }) => source.type === "browser")!.id);
        expect(data().transaction.entities[1]!.reference).toBe("HERE");
        await waitFor(() => expect(getReference(dropbox.readValue())).toBe("HERE"));
    });
});

describe("Starting up", () => {
    test("loads from Dropbox when the browser has lost its copy", async () => {
        await bootAndLink(withReference("BROWSER"));
        await deleteStore();

        const { data, storage } = await bootTopHat();

        expect(storage()).toEqual({ type: "loaded" });
        expect(data().transaction.entities[1]!.reference).toBe("BROWSER");
        await waitFor(async () => expect(getReference(await readFromStore())).toBe("BROWSER"));
    });

    test("doesn't start afresh, and writes nothing, when Dropbox can't be reached and the browser holds nothing", async () => {
        await bootAndLink(withReference("BROWSER"));
        await deleteStore();
        const before = dropbox.files.get(DROPBOX_FILE);
        setOnline(false);

        const { storage, dispatch, actions } = await bootTopHat();

        expect(storage()).toEqual({ type: "failed", error: expect.stringMatching(/could not reach Dropbox/) });
        dispatch(actions.updateUserPartial({ alphavantage: "CHANGED" }));
        setOnline(true);
        await pause(25);
        expect(await readRawFromStore()).toBeUndefined();
        expect(dropbox.files.get(DROPBOX_FILE)).toEqual(before);
    });

    test("puts the browser's store back in a saved list of targets that has lost it", async () => {
        await bootAndLink(withReference("BROWSER"));
        const saved = JSON.parse(localStorage.getItem(SYNC_CONFIG_KEY)!) as { type: string }[];
        localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(saved.filter(({ type }) => type !== "indexeddb")));

        const { dispatch, actions } = await bootTopHat();
        await waitFor(() => expect(readSavedTargetTypes()).toEqual(["indexeddb", "dropbox"]));

        dispatch(actions.updateTransactions([{ id: 1, changes: { reference: "CHANGED" } }]));
        await waitFor(async () => expect(getReference(await readFromStore())).toBe("CHANGED"));
    });
});

describe("The link an earlier version made", () => {
    const LegacyLink = { refreshToken: REFRESH_TOKEN, name: "A User", email: "user@example.com" };

    test("becomes a linked account once, and is then removed from the user's settings", async () => {
        await writeToStore({ ...withReference("BROWSER"), user: [{ ...getSavedData().user[0], dropbox: LegacyLink }] });

        const { data, remotes } = await bootTopHat();

        expect(remotes()).toMatchObject([{ type: "dropbox", account: { email: ACCOUNT.email } }]);
        expect(data().user.entities[0]!.dropbox).toBeUndefined();
        await waitFor(() => expect(dropbox.readValue()?.user[0]).not.toHaveProperty("dropbox"));
        expect(getReference(dropbox.readValue())).toBe("BROWSER");
        await waitFor(async () => expect((await readFromStore())!.user[0]).not.toHaveProperty("dropbox"));

        // Not again
        dropbox.requests = [];
        await bootTopHat();
        expect(dropbox.requests).not.toContain("users/get_current_account");
    });

    test("is tried again on a later boot when Dropbox can't be reached, and says nothing is backed up until then", async () => {
        await writeToStore({ ...getSavedData(), user: [{ ...getSavedData().user[0], dropbox: LegacyLink }] });
        setOnline(false);

        const offline = await bootTopHat();
        const { DROPBOX_NOTIFICATION_ID } = await getNotifications();
        expect(offline.data().user.entities[0]!.dropbox).toEqual(LegacyLink);
        expect(offline.data().notification.entities[DROPBOX_NOTIFICATION_ID]?.contents).toBe("retry");
        expect(offline.remotes()).toEqual([]);

        setOnline(true);
        const online = await bootTopHat();
        expect(online.remotes()).toMatchObject([{ type: "dropbox" }]);
        expect(online.data().user.entities[0]!.dropbox).toBeUndefined();
        await waitFor(() => expect(online.data().notification.entities[DROPBOX_NOTIFICATION_ID]).toBeUndefined());
    });

    test("is removed, and the user asked to link the account again, when Dropbox no longer accepts it", async () => {
        await writeToStore({ ...getSavedData(), user: [{ ...getSavedData().user[0], dropbox: LegacyLink }] });
        dropbox.refreshTokens.clear();

        const { data, remotes } = await bootTopHat();
        const { DROPBOX_NOTIFICATION_ID } = await getNotifications();

        expect(remotes()).toEqual([]);
        expect(data().user.entities[0]!.dropbox).toBeUndefined();
        expect(data().notification.entities[DROPBOX_NOTIFICATION_ID]?.contents).toBe("relink");
    });

    /** A redirect back from Dropbox that never finished left this, and nothing could link Dropbox again */
    test("treats a redirect that never finished as no link at all", async () => {
        await writeToStore({ ...getSavedData(), user: [{ ...getSavedData().user[0], dropbox: "loading" }] });

        const { data } = await bootTopHat();

        expect(data().user.entities[0]!.dropbox).toBeUndefined();
        expect(dropbox.requests).toEqual([]);
    });

    test("leaves the account's own file to the user to choose, when it and the browser both hold their own data", async () => {
        dropbox.putValue(withReference("DROPBOX"));
        await writeToStore({ ...withReference("BROWSER"), user: [{ ...getSavedData().user[0], dropbox: LegacyLink }] });

        // Boot waits on the move, which waits on the user
        const { tab, booted } = await startBootingTopHat();
        await waitFor(() => expect(tab.storage()).toMatchObject({ type: "conflict" }));
        expect(getReference(dropbox.readValue())).toBe("DROPBOX");
        expect(getReference(await readFromStore())).toBe("BROWSER");

        const { chooseStorageCopy } = await import("./index");
        const copies = (tab.storage() as StorageState & { type: "conflict" }).copies;
        await chooseStorageCopy(copies.find(({ source }) => source.type === "remote")!.id);
        await booted;

        expect(tab.data().transaction.entities[1]!.reference).toBe("DROPBOX");
        expect(tab.data().user.entities[0]!.dropbox).toBeUndefined();
        await waitFor(async () => expect(getReference(await readFromStore())).toBe("DROPBOX"));
    });
});

describe("Warnings", () => {
    test("says Dropbox holds the only copy when the browser can't save, and that nothing is saved when Dropbox can't either", async () => {
        // As in some private browsing modes
        const open = vi.spyOn(indexedDB, "open").mockImplementation(() => {
            throw new DOMException("The operation is insecure.", "SecurityError");
        });

        try {
            const { data, storage, dispatch, actions } = await bootTopHat();
            const { IDB_NOTIFICATION_ID } = await getNotifications();
            const warning = () => data().notification.entities[IDB_NOTIFICATION_ID]?.contents;

            expect(storage()).toEqual({ type: "unavailable", error: expect.any(String) });
            expect(warning()).toBe("");

            // Dropbox can still be linked, and then holds the only copy
            expect(await (await getDropbox()).linkDropboxAccount()).toEqual({ type: "linked", kept: "browser" });
            await waitFor(() => expect(warning()).toBe("remote-only"));

            // Until it can't be reached either
            setOnline(false);
            dispatch(actions.updateUserPartial({ alphavantage: "CHANGED" }));
            await waitFor(() => expect(warning()).toBe(""));
        } finally {
            open.mockRestore();
        }
    });

    test("stays usable, rather than going to the recovery screen, on a reload of a browser that has never saved", async () => {
        const open = vi.spyOn(indexedDB, "open").mockImplementation(() => {
            throw new DOMException("The operation is insecure.", "SecurityError");
        });

        try {
            await bootTopHat();
            const { storage } = await bootTopHat();
            expect(storage()).toEqual({ type: "unavailable", error: expect.any(String) });
        } finally {
            open.mockRestore();
        }
    });

    test("says a linked account is failing when Dropbox refuses a save, and stops once it takes one", async () => {
        const { dispatch, actions, data, remotes } = await bootAndLink();
        const { DROPBOX_NOTIFICATION_ID } = await getNotifications();

        dropbox.missingScope.add("files/upload");
        dispatch(actions.updateTransactions([{ id: 1, changes: { reference: "REFUSED" } }]));
        await waitFor(() => expect(data().notification.entities[DROPBOX_NOTIFICATION_ID]?.contents).toBe(""));
        expect(remotes()).toMatchObject([{ inStep: false, failing: true }]);

        dropbox.missingScope.clear();
        dispatch(actions.updateTransactions([{ id: 1, changes: { reference: "TAKEN" } }]));
        await waitFor(() => expect(data().notification.entities[DROPBOX_NOTIFICATION_ID]).toBeUndefined());
        // A save still pending from before can be the one that works, so the change is waited on itself
        await waitFor(() => expect(getReference(dropbox.readValue())).toBe("TAKEN"));
        await waitFor(() => expect(remotes()).toMatchObject([{ inStep: true, failing: false }]));
    });
});
