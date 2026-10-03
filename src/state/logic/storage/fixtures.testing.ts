/**
 * Test-only access to the store that TopHat saves into through personal-storage-wrapper, and an
 * in-process `BroadcastChannel` so that two boots in one test file talk to each other the way two
 * tabs would.
 *
 * Like the legacy fixtures, these are written against the raw IndexedDB API and Node's own gzip,
 * rather than the library, so that they describe what is really left in the browser.
 *
 * Test files install `fake-indexeddb/auto` themselves, before importing this or any of the app.
 */

import { gunzipSync, gzipSync } from "node:zlib";
import { vi } from "vitest";
import type { ListDataState } from "../../data";

/**
 * The store
 */
const STORE_DATABASE_NAME = "personal-storage-wrapper";
const STORE_TABLE_NAME = "stores";
export const STORE_ID = "tophat";

const openStoreDatabase = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(STORE_DATABASE_NAME);
        request.onupgradeneeded = () => request.result.createObjectStore(STORE_TABLE_NAME, { keyPath: "id" });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

const runOnStoreTable = <T>(mode: IDBTransactionMode, run: (table: IDBObjectStore) => IDBRequest<T>) =>
    openStoreDatabase().then(
        (db) =>
            new Promise<T>((resolve, reject) => {
                const tx = db.transaction([STORE_TABLE_NAME], mode);
                const request = run(tx.objectStore(STORE_TABLE_NAME));
                tx.oncomplete = () => {
                    db.close();
                    resolve(request.result);
                };
                tx.onerror = () => reject(tx.error);
                tx.onabort = () => reject(tx.error);
            })
    );

/**
 * The row's bytes exactly as they are stored, or undefined if there is no row. They are returned as a
 * Uint8Array because `toEqual` compares those byte by byte, but finds any two ArrayBuffers equal.
 */
export const readRawFromStore = async (id: string = STORE_ID) => {
    const row = await runOnStoreTable<{ buffer: ArrayBuffer } | undefined>("readonly", (table) => table.get(id));
    return row && new Uint8Array(row.buffer);
};

/** The saved value, decompressed and parsed without the library, or null if nothing is saved */
export const readFromStore = async <V = ListDataState>(id: string = STORE_ID): Promise<V | null> => {
    const bytes = await readRawFromStore(id);
    return bytes ? (JSON.parse(gunzipSync(bytes).toString()) as V) : null;
};

/** Saves bytes into the row, the way the library would have written them */
export const writeRawToStore = (buffer: ArrayBuffer, id: string = STORE_ID) =>
    runOnStoreTable("readwrite", (table) => table.put({ id, buffer, timestamp: new Date() }));

/** Saves a value, compressed the way the library compresses it */
export const writeToStore = (value: unknown, id: string = STORE_ID) =>
    // Copied, since a Buffer can be a view onto a larger, shared one
    writeRawToStore(new Uint8Array(gzipSync(JSON.stringify(value))).buffer, id);

/** Removes the whole database. Any connection the library holds closes when asked, so this is never blocked. */
export const deleteStore = () =>
    new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(STORE_DATABASE_NAME);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error("Blocked deleting " + STORE_DATABASE_NAME));
    });

/**
 * An in-process `BroadcastChannel`. Node's own does deliver between channels in one process, but
 * delivering the messages directly is simpler and more predictable: a structured clone, delivered in
 * a later task, to every other open channel, which is what the app sees in a browser.
 *
 * A manager only takes a broadcast value newer than its own, which it stamps when it is created, and
 * a send within the same millisecond as that loses a tie-break - so a test that has one boot write
 * straight after another starts should move the clock forward first.
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

/** Installs the channel for the rest of the file. Vitest gives each file fresh globals, unless run without isolation. */
export const installTestBroadcastChannel = () => vi.stubGlobal("BroadcastChannel", TestBroadcastChannel);

/**
 * Closes every channel, as closing every tab would, so that managers left open by one test do not
 * hear the next. The managers themselves stay open, but their connections to the store close as soon
 * as it is deleted, after which they cannot write to it either.
 */
export const closeTestBroadcastChannels = () =>
    channels.forEach((open) => Array.from(open).forEach((channel) => channel.close()));
