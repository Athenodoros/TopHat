/**
 * The Dropbox tests again, against a real Dropbox account rather than the fake one: moving over the
 * link an earlier version made, syncing, changes made elsewhere, linking, and the old backup.
 *
 * Skipped unless `DROPBOX_TEST_REFRESH_TOKEN` holds a refresh token for TopHat's app key, for an
 * account kept for testing: it writes, and finally deletes, `/data.json.gz` in that account. It reads
 * `/data.zip` but never changes it, and checks so. Run it with
 *
 *     DROPBOX_TEST_REFRESH_TOKEN=... yarn vitest run src/state/logic/storage/dropbox.live.test.ts
 *
 * Signing in through Dropbox's own page can't be automated, so the one request that exchanges a sign-in
 * code is answered here with the test token. Every other request goes to Dropbox.
 *
 * @vitest-environment jsdom
 */

// The in-memory implementation has to be installed before anything opens a database
import "fake-indexeddb/auto";

import { gunzipSync, gzipSync } from "node:zlib";
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import type { ListDataState } from "../../data";
import { bootTopHat, closeOpenManagers, loadTopHat, pause, startBootingTopHat, waitFor } from "./boot.testing";
import { setOnline } from "./dropbox.testing";
import {
    closeTestBroadcastChannels,
    deleteStore,
    installTestBroadcastChannel,
    readFromStore,
    writeToStore,
} from "./fixtures.testing";
import { deleteLegacyDatabase } from "./legacy";
import { Coffee, getSavedData } from "./legacy/fixtures.testing";
import type { StorageState } from "./types";

const TOKEN = process.env.DROPBOX_TEST_REFRESH_TOKEN;
const APP_KEY = "7ru69iyjvo0wz6t";
const FILE = "/data.json.gz";
const LEGACY_FILE = "/data.zip";

vi.mock("../currencies", () => ({ updateSyncedCurrencies: vi.fn(async () => undefined) }));

describe.skipIf(!TOKEN)("A real Dropbox account", () => {
    /**
     * Dropbox itself, for setting up and checking, with the test token
     */
    const realFetch = globalThis.fetch;
    let access = "";

    const refresh = async () => {
        const response = await realFetch(
            `https://api.dropboxapi.com/oauth2/token?grant_type=refresh_token&client_id=${APP_KEY}&refresh_token=${TOKEN}`,
            { method: "POST" }
        );
        const json = await response.json();
        if (!json.access_token) throw new Error("The test token was refused: " + JSON.stringify(json));
        access = json.access_token;
        return json as { access_token: string; expires_in: number };
    };
    const api = async (route: string, body: unknown) =>
        (
            await realFetch("https://api.dropboxapi.com/2/" + route, {
                method: "POST",
                headers: { authorization: "Bearer " + access, "Content-Type": "application/json" },
                body: JSON.stringify(body),
            })
        ).json();
    const getRev = async (path: string): Promise<string | null> =>
        (await api("files/get_metadata", { path })).rev ?? null;
    const remove = (path: string) => api("files/delete_v2", { path });
    const readValue = async (): Promise<ListDataState | null> => {
        const response = await realFetch("https://content.dropboxapi.com/2/files/download", {
            method: "POST",
            headers: { authorization: "Bearer " + access, "Dropbox-API-Arg": JSON.stringify({ path: FILE }) },
        });
        if (response.status === 409) return null;
        return JSON.parse(gunzipSync(Buffer.from(await response.arrayBuffer())).toString());
    };
    /** A save made on another device */
    const writeValue = async (value: ListDataState) =>
        realFetch("https://content.dropboxapi.com/2/files/upload", {
            method: "POST",
            headers: {
                authorization: "Bearer " + access,
                "Content-Type": "application/octet-stream",
                "Dropbox-API-Arg": JSON.stringify({ path: FILE, mode: "overwrite" }),
            },
            body: gzipSync(JSON.stringify(value)),
        });

    /**
     * The app, which talks to Dropbox itself, except for the exchange of a sign-in code
     */
    const withReference = (reference: string): ListDataState => ({
        ...getSavedData(),
        transaction: [{ ...Coffee, reference }],
    });
    const getReference = (value: ListDataState | null) => value?.transaction[0]?.reference;
    const legacyLink = (refreshToken: string) => ({ refreshToken, name: "Test", email: "test@example.com" });
    const withLegacyLink = (value: ListDataState, refreshToken: string) => ({
        ...value,
        user: [{ ...value.user[0], dropbox: legacyLink(refreshToken) }],
    });

    const link = async () => (await import("./dropbox")).linkDropboxAccount();

    let legacyRev: string | null = null;

    beforeAll(async () => {
        installTestBroadcastChannel();
        setOnline(true);
        await refresh();

        // Signing in: the popup comes straight back with a code, which is exchanged for the test token
        vi.spyOn(window, "open").mockImplementation(((url: string) => {
            const redirect = new URL(url).searchParams.get("redirect_uri")!;
            const search = "?code=live-test-code";
            return {
                closed: false,
                close: () => {},
                location: { origin: window.location.origin, href: redirect + search, search },
            };
        }) as unknown as typeof window.open);
        vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
            if (String(input).includes("grant_type=authorization_code")) {
                const { access_token, expires_in } = await refresh();
                return new Response(JSON.stringify({ access_token, refresh_token: TOKEN, expires_in }));
            }
            return realFetch(input, init);
        });

        await loadTopHat();
        await remove(FILE);
        legacyRev = await getRev(LEGACY_FILE);
    }, 120_000);

    afterEach(async () => {
        await pause(1000); // Real requests take longer to settle than the fake's
        closeOpenManagers();
        await pause(1000);
        closeTestBroadcastChannels();
        await deleteLegacyDatabase();
        await deleteStore();
        localStorage.clear();

        // Each test starts from an account with nothing synced to it, as the first boot after an upgrade
        // does: a file left by the last would hold data of its own, and the next test's boot would ask the
        // user to choose, and wait for them
        await remove(FILE);
    });

    afterAll(async () => {
        await remove(FILE);
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    const WAIT = 1500; // attempts of 10ms each: real requests take a while

    /**
     * Boots a browser that has data of its own and the link an earlier version made, and waits for the
     * move to settle: the target's first upload, and the save that follows once the old link is
     * removed from the data. A save from another device landing between the two would be overwritten -
     * the window between checking a remote and uploading to it, which only a conditional upload closes.
     */
    const bootMoved = async () => {
        await writeToStore(withLegacyLink(withReference("LIVE-BROWSER"), TOKEN!));
        const tab = await bootTopHat();
        await waitFor(async () => {
            const value = await readValue();
            expect(getReference(value)).toBe("LIVE-BROWSER");
            expect(value?.user[0]).not.toHaveProperty("dropbox");
        }, WAIT);
        await waitFor(() => expect(tab.remotes()).toMatchObject([{ inStep: true }]), WAIT);
        await pause(1000);
        return tab;
    };

    test("moves an earlier version's link over, uploads the browser's data, and leaves the old backup alone", async () => {
        await writeToStore(withLegacyLink(withReference("LIVE-BROWSER"), TOKEN!));

        const { data, remotes, dispatch, actions } = await bootTopHat();

        expect(remotes()).toMatchObject([{ type: "dropbox", inStep: true, failing: false }]);
        expect(data().user.entities[0]!.dropbox).toBeUndefined();
        await waitFor(async () => expect((await readValue())?.user[0]).not.toHaveProperty("dropbox"), WAIT);
        expect(getReference(await readValue())).toBe("LIVE-BROWSER");

        // And syncs from then on
        dispatch(actions.updateTransactions([{ id: 1, changes: { reference: "LIVE-EDIT" } }]));
        await waitFor(async () => expect(getReference(await readValue())).toBe("LIVE-EDIT"), WAIT);

        expect(await getRev(LEGACY_FILE)).toBe(legacyRev);
    }, 120_000);

    test("syncs on later boots without moving anything again, and takes a change made on another device", async () => {
        await bootMoved();
        closeOpenManagers();

        const { data, storage } = await bootTopHat();
        expect(storage()).toEqual({ type: "loaded" });

        await writeValue(withReference("LIVE-OTHER-DEVICE"));
        await (window as any).connection.manager.poll(); // The library's timer polls once a minute
        await waitFor(() => expect(data().transaction.entities[1]!.reference).toBe("LIVE-OTHER-DEVICE"), WAIT);
        await waitFor(async () => expect(getReference(await readFromStore())).toBe("LIVE-OTHER-DEVICE"), WAIT);
    }, 120_000);

    test("never saves over a change made on another device: the user chooses", async () => {
        const { dispatch, actions, storage, data } = await bootMoved();

        await writeValue(withReference("LIVE-OTHER-DEVICE"));
        dispatch(actions.updateTransactions([{ id: 1, changes: { reference: "LIVE-HERE" } }]));

        await waitFor(() => expect(storage()).toMatchObject({ type: "conflict" }), WAIT);
        expect(getReference(await readValue())).toBe("LIVE-OTHER-DEVICE");

        const { chooseStorageCopy } = await import("./index");
        const copies = (storage() as StorageState & { type: "conflict" }).copies;
        await chooseStorageCopy(copies.find(({ source }) => source.type === "browser")!.id);
        expect(data().transaction.entities[1]!.reference).toBe("LIVE-HERE");
        await waitFor(async () => expect(getReference(await readValue())).toBe("LIVE-HERE"), WAIT);
    }, 120_000);

    test("saves twice within a second without the second looking like no change", async () => {
        const { dispatch, actions, remotes } = await bootMoved();

        dispatch(actions.updateTransactions([{ id: 1, changes: { reference: "LIVE-FIRST" } }]));
        await waitFor(async () => expect(getReference(await readValue())).toBe("LIVE-FIRST"), WAIT);
        dispatch(actions.updateTransactions([{ id: 1, changes: { reference: "LIVE-SECOND" } }]));
        await waitFor(async () => expect(getReference(await readValue())).toBe("LIVE-SECOND"), WAIT);
        await waitFor(() => expect(remotes()).toMatchObject([{ inStep: true }]), WAIT);
    }, 120_000);

    test("loads from Dropbox when the browser has lost its copy", async () => {
        await bootMoved();
        closeOpenManagers();
        await deleteStore();

        const { data, storage } = await bootTopHat();

        expect(storage()).toEqual({ type: "loaded" });
        expect(data().transaction.entities[1]!.reference).toBe("LIVE-BROWSER");
    }, 120_000);

    test("links a new browser by taking the account's data, and refuses one holding different data of its own", async () => {
        await writeValue(withReference("LIVE-ACCOUNT"));

        const fresh = await bootTopHat();
        expect(await link()).toEqual({ type: "linked", kept: "dropbox" });
        expect(fresh.data().transaction.entities[1]!.reference).toBe("LIVE-ACCOUNT");
        closeOpenManagers();
        await deleteStore();
        localStorage.clear();

        await writeToStore(withReference("LIVE-OTHER-BROWSER"));
        await bootTopHat();
        expect(await link()).toEqual({ type: "refused" });
        expect(getReference(await readValue())).toBe("LIVE-ACCOUNT");
    }, 120_000);

    test("links a new browser to an account with only the old backup, by taking the backup", async () => {
        await remove(FILE);
        if (legacyRev === null) return; // The account has no old backup to read

        const { data } = await bootTopHat();
        const outcome = await link();

        expect(outcome).toEqual({ type: "linked", kept: "dropbox" });
        expect(data().user.entities[0]!.tutorial).toBe(false);
        expect(data().user.entities[0]!.dropbox).toBeUndefined(); // The backup holds an old link, which goes
        await waitFor(async () => expect(await readValue()).not.toBeNull(), WAIT);
        expect(await getRev(LEGACY_FILE)).toBe(legacyRev);
    }, 120_000);

    test("removes a link Dropbox no longer accepts, and asks the user to link again", async () => {
        await writeToStore(withLegacyLink(getSavedData(), "not-a-real-refresh-token"));

        const { data, remotes } = await bootTopHat();
        const { DROPBOX_NOTIFICATION_ID } = await import("../notifications/types");

        expect(remotes()).toEqual([]);
        expect(data().user.entities[0]!.dropbox).toBeUndefined();
        expect(data().notification.entities[DROPBOX_NOTIFICATION_ID]?.contents).toBe("relink");
    }, 120_000);

    test("doesn't start afresh when Dropbox can't be reached and the browser holds nothing", async () => {
        await bootMoved();
        closeOpenManagers();
        await deleteStore();
        const before = await getRev(FILE);

        setOnline(false);
        try {
            const { storage } = await startBootingTopHat().then(({ booted }) => booted);
            expect(storage()).toMatchObject({ type: "failed" });
        } finally {
            setOnline(true);
        }
        await pause(1000);
        expect(await getRev(FILE)).toBe(before);
    }, 120_000);
});
