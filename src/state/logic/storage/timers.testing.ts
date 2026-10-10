/**
 * Fake timers for the persistence tests, which install them for each test. The app's timers - a
 * save, a message to another tab, a backup, a report that another tab is blocking the old database -
 * then only go off when a test moves time on, so what has happened by a given point never depends on
 * how busy the machine is.
 */

import { vi } from "vitest";

/**
 * Everything but `setImmediate`, which fake-indexeddb runs every IndexedDB request from: left real,
 * the database keeps working while the app's own timers wait for the test.
 */
export const FAKE_TIMERS_BESIDE_INDEXEDDB = {
    toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"],
} satisfies Parameters<typeof vi.useFakeTimers>[0];

/**
 * Awaits a promise whose work waits on a timer, moving fake time on until it settles, in the same
 * 50ms steps `vi.waitFor` checks in. Each step lets the real event loop run, so IndexedDB requests go
 * through along the way. One that never settles is left to the test's timeout.
 */
export const settle = async <T>(promise: Promise<T>): Promise<T> => {
    let settled = false;
    promise.then(
        () => (settled = true),
        () => (settled = true)
    );

    await vi.advanceTimersByTimeAsync(0);
    while (!settled) await vi.advanceTimersByTimeAsync(50);

    return promise;
};
