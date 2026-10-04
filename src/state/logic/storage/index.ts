/**
 * Boot's side of storage: finding what is already saved in the browser, getting it into Redux, and
 * keeping the two in step from then on.
 *
 * The data lives in the store in `store.ts`. Only when that is empty is the database left by the
 * Dexie version of the app consulted: it is locked against old tabs, read, copied into the store,
 * and then left alone until the retention rules in `legacy/` let it go.
 *
 * Anything found that can't be used - a row that won't decode, data with no user in it, or data from
 * a newer version of the app - leaves the app on the recovery screen, and neither store is written.
 *
 * Copies of the data that disagree - the store's targets, or the store and an old database that a
 * Dexie version of the app has saved into since the copy - are settled by the rules in `conflicts.ts`
 * where they can be. Where they can't, the user chooses, and nothing is saved anywhere until they do.
 */

import { TopHatDispatch, TopHatStore } from "../..";
import { AppSlice } from "../../app";
import { DataSlice, getInitialTutorialLists, ListDataState, subscribeToDataUpdates, toListDataState } from "../../data";
import { DataKeys, StubUserID, User } from "../../data/types";
import { setIDBConnectionExists } from "../notifications/variants/idb";
import { describeCopy, getGeneration, holdsRealData } from "./conflicts";
import {
    getLegacyDatabaseState,
    lockLegacyDatabase,
    readLegacyDatabase,
    recordBootAndMaybeDeleteLegacyDatabase,
    recordLegacyMigration,
} from "./legacy";
import { CURRENT_GENERATION, handleMigrationsAndUpdates } from "./migrations";
import { rescueStorageContents } from "./rescue";
import { openStore, Store, StoreReadError, UnusableContents } from "./store";
import { StorageConnection, StorageCopy, StorageState } from "./types";

/** Data was found that can't be used, so nothing was written with it */
class UnusableDataError extends Error {}

/** Whether storage has stopped saving for good: see `StorageConnection.hasFrozenForRecovery` */
let frozenForRecovery = false;

/** The store, once it is open, so that stopping for good can close it */
let openedStore: Store | null = null;

export const setupStorageAndLoadData = async (
    debug: boolean
): Promise<{ connection: StorageConnection; storage: StorageState }> => {
    let copyingLegacy = false;
    let lockedLegacy = false;

    setIDBConnectionExists(true);

    let store: Store;
    try {
        store = await openStore({
            // A lock that another tab holds up throws, leaving the app on the Try Again page unread
            getInitialValue: async () => {
                const legacy = await lockAndReadLegacyDatabase();
                if (legacy === null) return getInitialTutorialLists();

                if (debug) console.log("Copying data saved by an earlier version of TopHat...");
                copyingLegacy = true;
                return legacy;
            },
            validate: getProblemWithValue,
            // Another tab may run an older version of the app, so its value is migrated as a stored one
            // is, and the migrated value saved: the migrations run outside the echo guard
            onExternalValue: (value) => {
                if (debug) console.log("Updating store from another tab...");
                loadValueFromStorage(value);
            },
            // Data saved by a newer version of the app open alongside this one, say: this tab stops
            // saving and goes to the recovery screen, rather than load data it doesn't understand.
            // Boot may still be running, so it is told at once, before the slower rescue.
            onUnusableValue: (problem, contents) => freeze(getUnreadableState(problem, contents)),
            onSaveStatus: setIDBConnectionExists,
            getLiveValue,
            chooseCopy: async (copies) => {
                const choices = copies.map(
                    ({ source, timestamp, value, isLive }, index): Choice => ({
                        copy: describeChoice("copy-" + index, source, timestamp, value),
                        // The library takes on exactly the value returned, so the app's own copy is taken
                        // as it is when chosen, with anything that changed while the user was choosing
                        load: async () => (isLive ? getLiveValue() : value),
                    })
                );
                return (await askUserToChoose(choices)).value;
            },
        });
    } catch (error) {
        if (error instanceof StoreReadError)
            return error.unavailable
                ? getUnavailableState(error.message)
                : getUnreadableState(error.message, error.contents);
        if (error instanceof UnusableDataError) return getUnreadableState(error.message, null);
        throw error;
    }
    openedStore = store;
    const connection: StorageConnection = {
        debugVariables: store.debugVariables,
        hasFrozenForRecovery: () => frozenForRecovery,
        isHoldingWrites: () => frozenForRecovery || choice !== null,
    };

    if (debug) console.log("Loading data from storage...");
    const migrated = loadValueFromStorage(store.getValue());

    // Before anything is saved, since the user may keep the old database's data instead
    if (store.loadedFromStore && !frozenForRecovery) {
        const legacy = await resolveUnlockedLegacyDatabase();
        if (legacy.kept) {
            if (debug) console.log("Copying data saved by an earlier version of TopHat again...");
            loadValueFromStorage(legacy.kept);
            copyingLegacy = true;
        }
        lockedLegacy = legacy.locked;
    }

    // While the user chooses between copies the library writes nothing, but it would still take a
    // value it was given as its own and send it to other tabs, which would load a copy nobody chose
    subscribeToDataUpdates(() => {
        if (applyingFromStorage || choice) return;
        setTimeout(() => choice || store.save(getLiveValue()), 0);
    });

    // The manager writes in what it was opened with, but not what the migrations made of it, and
    // without waiting. A copy is only recorded once it is known to be saved: otherwise the next boot
    // finds the store empty and copies again.
    const saved = migrated || copyingLegacy ? await store.save(getLiveValue()) : true;

    // Another tab may have saved data this one can't use while it waited, and a boot that ends on the
    // recovery screen must neither record a copy nor count towards deleting the old database
    if (frozenForRecovery) return { connection, storage: { type: "loaded" } };

    // Retention only ever delays the deletion, so the data is saving and loaded whatever happens there.
    // An old database this boot has only just locked is kept for as long as one it had just copied.
    if (copyingLegacy) {
        if (saved) recordLegacyMigration();
    } else if (lockedLegacy) recordLegacyMigration();
    else if (store.loadedFromStore)
        await recordBootAndMaybeDeleteLegacyDatabase().catch((error) =>
            console.error("TopHat could not check on the database left by an earlier version", error)
        );

    return { connection, storage: { type: store.loadedFromStore || copyingLegacy ? "loaded" : "empty" } };
};

/**
 * Locks the old database and then reads it, in that order, so that no old tab can change the rows
 * between their being read and copied. A lock that another tab holds up throws as it is. Data that
 * can't be used throws an `UnusableDataError`, so that it is never mistaken for a new install.
 */
const lockAndReadLegacyDatabase = async (): Promise<ListDataState | null> => {
    await lockLegacyDatabase();

    let legacy: ListDataState | null;
    try {
        legacy = await readLegacyDatabase();
    } catch (error) {
        throw new UnusableDataError(getErrorMessage(error));
    }

    const problem = legacy && getProblemWithValue(legacy);
    if (problem) throw new UnusableDataError(problem);

    return legacy;
};

/**
 * Only a copying boot locks the old database, so one that isn't locked alongside a store that holds
 * data was made since: by a Dexie version of the app - a revert of this one, or an old tab - once it
 * had deleted the locked one from its recovery screen, say. It may hold changes the store doesn't.
 *
 * If it holds data of the user's own, they choose between it and the store. Otherwise it is locked,
 * which lets retention delete it in time. One that can't be read or used is left as it is, since it
 * may still be someone's data. Resolves to the old database's data if the user keeps it, and to
 * whether it is now locked - which the copy of data the user keeps does too.
 */
const resolveUnlockedLegacyDatabase = async (): Promise<{ kept: ListDataState | null; locked: boolean }> => {
    let legacy: ListDataState | null;
    try {
        if ((await getLegacyDatabaseState()) !== "unlocked") return { kept: null, locked: false };
        legacy = await readLegacyDatabase();
    } catch (error) {
        console.error("TopHat could not read the database left by an earlier version", error);
        return { kept: null, locked: false };
    }

    const problem = legacy && getProblemWithValue(legacy);
    if (problem) {
        console.error("TopHat can't use the data in the database left by an earlier version: " + problem);
        return { kept: null, locked: false };
    }

    if (legacy !== null && holdsRealData(legacy)) {
        const kept = await askUserToChoose([
            {
                copy: describeChoice("browser", { type: "browser" }, null, getLiveValue()),
                load: async () => getLiveValue(),
            },
            {
                copy: describeChoice("legacy", { type: "legacy" }, null, legacy),
                // Old tabs could still write to it until now: it is locked and read again, as a first copy is
                load: async () => {
                    const value = await lockAndReadLegacyDatabase();
                    if (value === null) throw new UnusableDataError("The earlier version's data is no longer there.");
                    return value;
                },
            },
        ]);
        if (kept.id === "legacy") return { kept: kept.value, locked: true };
    }

    return lockLegacyDatabase().then(
        () => ({ kept: null, locked: true }),
        (error) => {
            console.error("TopHat could not lock the database left by an earlier version", error);
            return { kept: null, locked: false };
        }
    );
};

/**
 * Choosing between copies
 */

interface Choice {
    copy: StorageCopy;
    /** The copy's value, read again where it may have changed since it was offered */
    load: () => Promise<ListDataState>;
}

/** The choice the user has yet to make, or null. Nothing is saved anywhere while there is one. */
let choice: {
    choices: Choice[];
    resolve: (kept: { id: string; value: ListDataState }) => void;
    /** What was on screen when the choice was put to the user */
    restore: StorageState;
} | null = null;

/** Boot's result, if boot finished while the user was choosing, to be shown once they have */
let heldStorageState: StorageState | null = null;

/** Choices are put to the user one at a time, should a second come up while one is open */
let choosing: Promise<unknown> = Promise.resolve();

const askUserToChoose = (choices: Choice[]) => {
    const asked = choosing.then(
        () =>
            new Promise<{ id: string; value: ListDataState }>((resolve) => {
                choice = { choices, resolve, restore: TopHatStore.getState().app.storage };
                TopHatDispatch(
                    AppSlice.actions.setStorageState({ type: "conflict", copies: choices.map(({ copy }) => copy) })
                );
            })
    );
    choosing = asked;
    return asked;
};

const describeChoice = (
    id: string,
    source: StorageCopy["source"],
    savedAt: Date | null,
    value: ListDataState
): StorageCopy => ({ id, source, savedAt: savedAt?.toISOString() ?? null, summary: describeCopy(value) });

/**
 * Keeps the copy the user picked. A copy that can't be used when it is read again goes to the recovery
 * screen instead, and one that can't be read yet - an old database that another tab holds on to - to
 * the Try Again page. Either way the choice is left open, so that nothing is written over either copy.
 */
export const chooseStorageCopy = async (id: string) => {
    const open = choice;
    const chosen = open?.choices.find(({ copy }) => copy.id === id);
    if (!open || !chosen) return;

    let value: ListDataState;
    try {
        value = await chosen.load();

        const problem = getProblemWithValue(value);
        if (problem) throw new UnusableDataError(problem);
    } catch (error) {
        if (error instanceof UnusableDataError) freeze(getUnreadableState(error.message, null));
        else freeze(Promise.resolve({ storage: { type: "failed", error: getErrorMessage(error) } }));
        return;
    }

    // Asked twice, or frozen by another tab while the copy was read
    if (choice !== open || frozenForRecovery) return;

    choice = null;
    TopHatDispatch(AppSlice.actions.setStorageState(heldStorageState ?? open.restore));
    heldStorageState = null;
    open.resolve({ id, value });
};

/** Shows boot's result - unless the user is choosing between copies by then, and then once they have */
export const showStorageStateAfterBoot = (storage: StorageState) => {
    if (choice) heldStorageState = storage;
    else TopHatDispatch(AppSlice.actions.setStorageState(storage));
};

/** Stops saving for good, and shows the screen that says why once it is ready */
const freeze = (state: Promise<{ storage: StorageState }>) => {
    frozenForRecovery = true;
    openedStore?.close();
    state.then(({ storage }) => TopHatDispatch(AppSlice.actions.setStorageState(storage)));
};

/**
 * Loading
 */

const getLiveValue = () => toListDataState(TopHatStore.getState().data);

/**
 * Applying a value from storage dispatches into the store, which runs the same listeners a user's
 * change does. Without this flag, every value arriving from another tab would be written straight
 * back out again. It is read synchronously, because the listeners run inside the reducer.
 */
let applyingFromStorage = false;
const applyValueFromStorage = (value: ListDataState) => {
    applyingFromStorage = true;
    try {
        TopHatDispatch(DataSlice.actions.setFromStorage(withEveryList(value)));
    } finally {
        applyingFromStorage = false;
    }
};

/** Puts a value from storage into Redux and migrates it, returning whether the migrations changed anything */
const loadValueFromStorage = (value: ListDataState) => {
    applyValueFromStorage(value);

    const beforeMigrations = TopHatStore.getState().data;
    handleMigrationsAndUpdates(getGeneration(value));
    return TopHatStore.getState().data !== beforeMigrations;
};

/**
 * A list added to the app since a value was saved is missing from it, and starts empty, as it does
 * when the old database has no table for it
 */
const withEveryList = (value: ListDataState) =>
    Object.fromEntries(DataKeys.map((key) => [key, value[key] ?? []])) as unknown as ListDataState;

/** Why a stored value can't be loaded, or null if it can. A missing list is not a problem: see above. */
const getProblemWithValue = (value: unknown): string | null => {
    const lists = value as Partial<ListDataState>;
    if (
        typeof value !== "object" ||
        value === null ||
        DataKeys.some((key) => lists[key] !== undefined && !Array.isArray(lists[key]))
    )
        return "The saved data is damaged: some of it isn't in the form TopHat saves it in.";

    const user = ((lists.user ?? []) as User[]).find((user) => user?.id === StubUserID);
    if (user === undefined) return "The saved data has no user settings in it, so TopHat can't tell what it holds.";

    const generation = user.generation ?? 0;
    if (generation > CURRENT_GENERATION)
        return `This data was saved by a newer version of TopHat (generation ${generation}, where this version reads up to ${CURRENT_GENERATION}). Reloading the page may update TopHat.`;

    return null;
};

/** Where boot found nothing it could open, and so nothing that could stop saving later */
const NO_CONNECTION: StorageConnection = {
    debugVariables: {},
    hasFrozenForRecovery: () => false,
    isHoldingWrites: () => false,
};

const getUnreadableState = async (
    error: string,
    contents: UnusableContents | null
): Promise<{ connection: StorageConnection; storage: StorageState }> => {
    setIDBConnectionExists(false);
    return {
        connection: NO_CONNECTION,
        storage: { type: "unreadable", error, rescuedRows: await rescueStorageContents(contents) },
    };
};

/**
 * The store can't be opened at all, and has never been opened in this browser. That is only harmless
 * if there is nothing in the old database either: if there is, it is data that can't be loaded, and
 * must not look like a new install.
 */
const getUnavailableState = async (
    error: string
): Promise<{ connection: StorageConnection; storage: StorageState }> => {
    const unreadable = await getUnreadableState(error, null);
    if (unreadable.storage.type === "unreadable" && unreadable.storage.rescuedRows) return unreadable;

    return { connection: NO_CONNECTION, storage: { type: "unavailable", error } };
};

const getErrorMessage = (error: unknown) => (error instanceof Error && error.message) || "" + error;
