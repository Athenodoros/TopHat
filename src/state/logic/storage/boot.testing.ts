/**
 * Booting the whole app in a test, as a page load would, and waiting on what it does in the background.
 *
 * A test file using this mocks whatever boot reaches that it isn't testing, installs `fake-indexeddb/auto`
 * first, and loads the app's module graph once at collection time - `await loadTopHat()` - since the
 * first load takes about half a minute, which the per-test timeout doesn't allow for.
 */

import { vi } from "vitest";

export const loadTopHat = () => Promise.all([import("../.."), import("../../data"), import("../startup")]);

/**
 * A fresh page load: a new module registry, and so a new store, manager and listeners. Resolves once
 * the modules are loaded, with the tab and a promise of its boot finishing, for tests that act mid-boot.
 */
export const startBootingTopHat = async () => {
    vi.resetModules();

    const [{ TopHatStore, TopHatDispatch }, { DataSlice }, { initialiseAndGetDBConnection }] = await loadTopHat();
    const booted = initialiseAndGetDBConnection();
    void booted.then(keepManager);

    const tab = {
        dispatch: TopHatDispatch,
        actions: DataSlice.actions,
        data: () => TopHatStore.getState().data,
        storage: () => TopHatStore.getState().app.storage,
        remotes: () => TopHatStore.getState().app.remotes,
    };
    return { tab, booted: booted.then(() => tab) };
};

export const bootTopHat = async () => (await startBootingTopHat()).booted;

/**
 * Every boot leaves its manager open, the way an open tab would. One with a remote target goes on
 * polling it, and so must be closed before the next test's fake remote is set up. Boot puts its
 * manager on the window for debugging, which is where it is found - before the end of boot, so that
 * one whose boot never finished, waiting on a choice, say, is closed too.
 */
export const closeOpenManagers = () => {
    keepManager();
    while (managers.length) managers.pop()!.close();
};
const managers: { close: () => void }[] = [];
const keepManager = () => {
    const manager = (window as { connection?: { manager?: { close: () => void } } }).connection?.manager;
    if (manager && !managers.includes(manager)) managers.push(manager);
};

export const pause = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * Saves are fired from a `setTimeout` and never awaited, so tests poll for them. Attempts are counted
 * rather than timed, because some tests move the clock.
 */
export const waitFor = async <T>(assertion: () => T | Promise<T>, attempts: number = 200): Promise<T> => {
    for (let attempt = 1; ; attempt++) {
        try {
            return await assertion();
        } catch (error) {
            if (attempt >= attempts) throw error;
            await pause(10);
        }
    }
};

/** A manager only takes a value from another tab if it is newer than its own, so tabs that write move the clock */
export const moveClockForward = () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 1000);
};
