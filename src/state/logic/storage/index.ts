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
 */

import { TopHatDispatch, TopHatStore } from "../..";
import { AppSlice } from "../../app";
import { DataSlice, getInitialTutorialLists, ListDataState, subscribeToDataUpdates, toListDataState } from "../../data";
import { DataKeys, StubUserID, User } from "../../data/types";
import { setIDBConnectionExists } from "../notifications/variants/idb";
import {
    lockLegacyDatabase,
    readLegacyDatabase,
    recordBootAndMaybeDeleteLegacyDatabase,
    recordLegacyMigration,
} from "./legacy";
import { CURRENT_GENERATION, handleMigrationsAndUpdates } from "./migrations";
import { rescueStorageContents } from "./rescue";
import { openStore, Store, StoreReadError, UnusableContents } from "./store";
import { StorageConnection, StorageState } from "./types";

/** The old database holds data that can't be used, so the store was left empty rather than given it */
class UnusableLegacyDataError extends Error {}

export const setupStorageAndLoadData = async (
    debug: boolean
): Promise<{ connection: StorageConnection; storage: StorageState }> => {
    let copyingLegacy = false;
    let frozenForRecovery = false;

    setIDBConnectionExists(true);

    let store: Store;
    try {
        store = await openStore({
            // A lock that another tab holds up throws, leaving the app on the Try Again page unread
            getInitialValue: async () => {
                // Locked first, so that no old tab can change the rows between their being read and copied
                await lockLegacyDatabase();

                let legacy: ListDataState | null;
                try {
                    legacy = await readLegacyDatabase();
                } catch (error) {
                    throw new UnusableLegacyDataError(getErrorMessage(error));
                }
                if (legacy === null) return getInitialTutorialLists();

                const problem = getProblemWithValue(legacy);
                if (problem) throw new UnusableLegacyDataError(problem);

                if (debug) console.log("Copying data saved by an earlier version of TopHat...");
                copyingLegacy = true;
                return legacy;
            },
            validate: getProblemWithValue,
            onExternalValue: (value) => {
                if (debug) console.log("Updating store from another tab...");
                applyValueFromStorage(value);
            },
            // Data saved by a newer version of the app open alongside this one, say: this tab stops
            // saving and goes to the recovery screen, rather than load data it doesn't understand.
            // Boot may still be running, so it is told at once, before the slower rescue.
            onUnusableValue: (problem, contents) => {
                frozenForRecovery = true;
                getUnreadableState(problem, contents).then(({ storage }) =>
                    TopHatDispatch(AppSlice.actions.setStorageState(storage))
                );
            },
            onSaveStatus: setIDBConnectionExists,
        });
    } catch (error) {
        if (error instanceof StoreReadError)
            return error.unavailable
                ? getUnavailableState(error.message)
                : getUnreadableState(error.message, error.contents);
        if (error instanceof UnusableLegacyDataError) return getUnreadableState(error.message, null);
        throw error;
    }
    const connection: StorageConnection = {
        debugVariables: store.debugVariables,
        hasFrozenForRecovery: () => frozenForRecovery,
    };

    if (debug) console.log("Loading data from storage...");
    const value = store.getValue();
    applyValueFromStorage(value);

    const beforeMigrations = TopHatStore.getState().data;
    handleMigrationsAndUpdates((value.user as User[]).find(({ id }) => id === StubUserID)!.generation);
    const migrated = TopHatStore.getState().data !== beforeMigrations;

    subscribeToDataUpdates(() => {
        if (applyingFromStorage) return;
        setTimeout(() => store.save(toListDataState(TopHatStore.getState().data)), 0);
    });

    // The manager writes in what it was opened with, but not what the migrations made of it, and
    // without waiting. A copy is only recorded once it is known to be saved: otherwise the next boot
    // finds the store empty and copies again.
    const saved = migrated || copyingLegacy ? await store.save(toListDataState(TopHatStore.getState().data)) : true;
    if (copyingLegacy) {
        if (saved) recordLegacyMigration();
    } else if (store.loadedFromStore) await recordBootAndMaybeDeleteLegacyDatabase();

    return { connection, storage: { type: store.loadedFromStore || copyingLegacy ? "loaded" : "empty" } };
};

/**
 * Applying a value from storage dispatches into the store, which runs the same listeners a user's
 * change does. Without this flag, every value arriving from another tab would be written straight
 * back out again. It is read synchronously, because the listeners run inside the reducer.
 */
let applyingFromStorage = false;
const applyValueFromStorage = (value: ListDataState) => {
    applyingFromStorage = true;
    try {
        TopHatDispatch(DataSlice.actions.setFromStorage(value));
    } finally {
        applyingFromStorage = false;
    }
};

/** Why a stored value can't be loaded, or null if it can */
const getProblemWithValue = (value: unknown): string | null => {
    const lists = value as ListDataState;
    if (typeof value !== "object" || value === null || DataKeys.some((key) => !Array.isArray(lists[key])))
        return "The saved data is damaged: some of what TopHat saves is missing from it.";

    const user = (lists.user as User[]).find((user) => user?.id === StubUserID);
    if (user === undefined) return "The saved data has no user settings in it, so TopHat can't tell what it holds.";

    const generation = user.generation ?? 0;
    if (generation > CURRENT_GENERATION)
        return `This data was saved by a newer version of TopHat (generation ${generation}, where this version reads up to ${CURRENT_GENERATION}). Reloading the page may update TopHat.`;

    return null;
};

/** Where boot found nothing it could open, and so nothing that could stop saving later */
const NO_CONNECTION: StorageConnection = { debugVariables: {}, hasFrozenForRecovery: () => false };

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
 * The store can't be opened at all. That is only harmless if there is nothing in the old database
 * either: if there is, it is data that can't be loaded, and must not look like a new install.
 */
const getUnavailableState = async (
    error: string
): Promise<{ connection: StorageConnection; storage: StorageState }> => {
    const unreadable = await getUnreadableState(error, null);
    if (unreadable.storage.type === "unreadable" && unreadable.storage.rescuedRows) return unreadable;

    return { connection: NO_CONNECTION, storage: { type: "unavailable", error } };
};

const getErrorMessage = (error: unknown) => (error instanceof Error && error.message) || "" + error;
