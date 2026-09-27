/**
 * @vitest-environment jsdom
 */

/**
 * That personal-storage-wrapper installs, resolves and runs here, before any of the app uses it: its
 * source through the aliases, its compression both natively and through `fflate`, and its cross-tab
 * updates. None of the app is imported, and nothing in it imports the library yet.
 */

// The in-memory implementation has to be installed before anything opens a database
import "fake-indexeddb/auto";

import { gunzipSync } from "node:zlib";
import { IndexedDBTarget, PersonalStorageManager, type ValueUpdateOrigin } from "personal-storage-wrapper";
import { afterAll, afterEach, expect, test, vi } from "vitest";

/**
 * An in-process `BroadcastChannel`, so that two managers in this file talk to each other the way two
 * tabs would. Node's own does deliver between channels in one process, but delivering the messages
 * directly is simpler and more predictable: a structured clone, delivered in a later task, to every
 * other open channel, which is what the app sees in a browser.
 */
const channels = new Map<string, Set<TestBroadcastChannel>>();

class TestBroadcastChannel {
    readonly name: string;
    onmessage: ((event: { data: unknown }) => void) | null = null;
    onmessageerror: ((event: { data: unknown }) => void) | null = null;
    private closed = false;

    constructor(name: string) {
        this.name = name;

        const existing = channels.get(name) ?? new Set<TestBroadcastChannel>();
        existing.add(this);
        channels.set(name, existing);
    }

    postMessage(message: unknown) {
        if (this.closed) throw new Error("Cannot post to a closed BroadcastChannel");

        // Structured-cloned once, so that no listener can reach the sender's own objects
        const data = structuredClone(message);

        for (const channel of channels.get(this.name) ?? []) {
            if (channel === this || channel.closed) continue;
            setTimeout(() => !channel.closed && channel.onmessage?.({ data }), 0);
        }
    }

    close() {
        this.closed = true;
        channels.get(this.name)?.delete(this);
    }

    addEventListener() {
        throw new Error("This BroadcastChannel only supports `onmessage`");
    }
}

// Vitest gives each test file fresh globals, but not when run without isolation, so it is put back
vi.stubGlobal("BroadcastChannel", TestBroadcastChannel);
afterAll(() => {
    vi.unstubAllGlobals();
});

// Everything a test opens or fakes, undone after it whether or not it passed
const cleanups: (() => void)[] = [];
afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => cleanup());
    vi.useRealTimers();
});

const DATABASE_NAME = "personal-storage-wrapper";
const TABLE_NAME = "stores";

type TestValue = { list: number[] };

/** The value the library wrote, read and decompressed without the library */
const readStoredValue = (id: string) =>
    new Promise<unknown>((resolve, reject) => {
        const open = indexedDB.open(DATABASE_NAME);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
            const db = open.result;
            const request = db.transaction([TABLE_NAME], "readonly").objectStore(TABLE_NAME).get(id);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                db.close();
                const row: { buffer: ArrayBuffer } | undefined = request.result;
                resolve(row && JSON.parse(gunzipSync(row.buffer).toString()));
            };
        };
    });

const deleteDatabase = () =>
    new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(DATABASE_NAME);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error("Blocked deleting " + DATABASE_NAME));
    });

const createTarget = async (id: string) => {
    const target = await IndexedDBTarget.create(id);
    cleanups.push(target.close);
    return target;
};

const createManager = async (
    target: IndexedDBTarget,
    onValueUpdate: (value: TestValue, origin: ValueUpdateOrigin) => void = () => undefined
) => {
    const manager = await PersonalStorageManager.create<TestValue>(
        { list: [] },
        {
            id: "smoke-test",
            ignoreDuplicateCheck: true,
            getDefaultSyncs: async () => [{ target, compressed: true }],
            getSyncData: () => null,
            saveSyncData: () => undefined,
            pollPeriodInSeconds: null,
            onValueUpdate,
        }
    );
    cleanups.push(manager.close);
    return manager;
};

test("Writes a compressed value to IndexedDB, and lets go of the database when closed", async () => {
    const target = await createTarget("compressed-row");
    const manager = await createManager(target);

    await manager.setValue({ list: [1, 2, 3] });
    expect(await readStoredValue("compressed-row")).toEqual({ list: [1, 2, 3] });

    // An open connection would leave the delete blocked
    manager.close();
    target.close();
    await deleteDatabase();
});

test("Compresses through fflate where the browser has no CompressionStream", async () => {
    // Node's is visible under jsdom, so the fallback, and the import of `fflate`, is otherwise never used
    const global = globalThis as { CompressionStream?: unknown };
    const { CompressionStream } = global;
    delete global.CompressionStream;
    cleanups.push(() => (global.CompressionStream = CompressionStream));
    expect("CompressionStream" in window).toBe(false);

    const manager = await createManager(await createTarget("fflate"));

    await manager.setValue({ list: [5] });
    expect(await readStoredValue("fflate")).toEqual({ list: [5] });
});

test("Sends a new value to another manager, the way one tab tells another", async () => {
    const received: [TestValue, ValueUpdateOrigin][] = [];

    const sender = await createManager(await createTarget("broadcast"));
    await createManager(await createTarget("broadcast"), (value, origin) => received.push([value, origin]));

    // A manager only takes a broadcast value newer than its own, which here was stamped at creation,
    // and a send within the same millisecond as that would lose the tie-break
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 1000);

    await sender.setValue({ list: [4] });
    await vi.waitFor(() => expect(received).toContainEqual([{ list: [4] }, "BROADCAST"]));
});
