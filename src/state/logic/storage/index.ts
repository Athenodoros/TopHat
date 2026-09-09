/**
 * Boot: finding whatever data is already in the browser, getting it into the store, and keeping the
 * two in step from then on.
 *
 * The data lives in a personal-storage-wrapper manager, which holds one value - the lists that
 * `setFromIndexedDB` takes - across a set of targets. There is always an IndexedDB target, and there
 * may also be a Dropbox one. Anything left in the database the old Dexie layer wrote is read once,
 * copied into the new store, and then kept untouched until the rule in `legacy.ts` says it can go.
 */

import { DefaultTarget, DropboxTarget, PersonalStorageManager, Sync } from "personal-storage-wrapper";
import { TopHatDispatch, TopHatStore } from "../..";
import { AppSlice } from "../../app";
import { DataSlice, initialTutorialState, ListDataState, subscribeToDataUpdates } from "../../data";
import { DROPBOX_NOTIFICATION_ID } from "../notifications/types";
import { setIDBConnectionExists } from "../notifications/variants/idb";
import { readLegacyDatabase, recordBootAndMaybeDeleteLegacyDatabase, setMigrationRecord } from "./legacy";
import { CURRENT_GENERATION, handleMigrationsAndUpdates } from "./migrations";
import {
    getDefaultSyncs,
    getSyncData,
    latestTimestampWins,
    remoteWinsOverFreshInstall,
    saveSyncData,
    setStorageManager,
    STORAGE_ID,
    toListDataState,
    TopHatStorageManager,
} from "./manager";
import { setRescuedContents } from "./rescue";
import { StorageState, SyncDisplayState } from "./types";

export const setupStorageAndLoadData = async (
    debug: boolean
): Promise<{ manager: TopHatStorageManager; storage: StorageState }> => {
    let usedDefault = false;
    let loadedFromLegacy = false;
    let idbError: string | null = null;

    const manager = await PersonalStorageManager.create<ListDataState>(
        // Only reached when every target is empty or unreadable, which is where a database left by
        // the Dexie version of the app gets picked up
        async () => {
            usedDefault = true;

            const legacy = await readLegacyDatabase().catch(() => null);
            if (legacy) {
                if (debug) console.log("Loading data left by an earlier version of TopHat...");
                loadedFromLegacy = true;
                return legacy;
            }

            return toListDataState(initialTutorialState);
        },
        {
            id: STORAGE_ID,
            getSyncData,
            saveSyncData,
            getDefaultSyncs,

            // Cross-tab updates come over the broadcast channel, and TopHat has never polled Dropbox
            pollPeriodInSeconds: null,

            handleAllEmptyAndFailedSyncsOnStartup: async (results) => {
                const failure = results.find(({ sync, value }) => sync.target.type === "indexeddb" && value.error);
                if (failure) idbError = describeIDBFailure(failure.value.error!);

                return { behaviour: "DEFAULT" };
            },
            resolveConflictingSyncValuesOnStartup: latestTimestampWins,
            resolveConflictingSyncsUpdate: remoteWinsOverFreshInstall,

            // Wired here rather than afterwards, because a conflict between targets is resolved
            // after `create` has already returned with the first value it found
            onValueUpdate: (value, origin) => {
                if (origin === "CREATION" || origin === "LOCAL") return;

                if (debug) console.log("Updating store from saved data (" + origin + ")...");
                applyValueFromStorage(value);
            },
            onSyncStatesUpdate: (syncs) => TopHatDispatch(AppSlice.actions.setSyncStates(describeSyncs(syncs))),
            handleSyncOperationLog: ({ sync, stage }) => {
                if (sync.target.type === "indexeddb") {
                    if (stage === "ERROR" || stage === "OFFLINE") setIDBConnectionExists(false);
                    if (stage === "SUCCESS") setIDBConnectionExists(true);
                }

                // Being offline is not a failure - the old app skipped saves to Dropbox entirely
                if (sync.target.type === "dropbox" && (stage === "ERROR" || stage === "SUCCESS"))
                    TopHatDispatch(
                        DataSlice.actions.updateNotificationState({
                            id: DROPBOX_NOTIFICATION_ID,
                            contents: stage === "ERROR" ? "" : null,
                        })
                    );
            },
        }
    );
    setStorageManager(manager);

    const value = manager.getValue();
    const generation = value.user[0]?.generation ?? 0;

    /**
     * Data written by a later version of the app, which this one has no migrations for. It is left
     * exactly as it is: nothing is wired up, so nothing can be written over it.
     */
    if (generation > CURRENT_GENERATION) {
        setRescuedContents(value);
        setIDBConnectionExists(true);

        return {
            manager,
            storage: {
                type: "unreadable",
                error: `This data was written by a newer version of TopHat (generation ${generation}, and this version reads ${CURRENT_GENERATION}).`,
                rescuedRows: countRows(value),
            },
        };
    }

    applyValueFromStorage(value);

    const beforeMigrations = TopHatStore.getState().data;
    handleMigrationsAndUpdates(generation);
    const migrated = TopHatStore.getState().data !== beforeMigrations;

    subscribeToDataUpdates(() => {
        if (applyingFromStorage) return;

        setTimeout(() => manager.setValue(toListDataState(TopHatStore.getState().data)), 0);
    });

    // The legacy copy was written into the new store as it was read, and the migrated one is the
    // one worth keeping. Nothing has been saved yet if migrations ran before the listener was wired.
    if (migrated || loadedFromLegacy) manager.setValue(toListDataState(TopHatStore.getState().data));

    if (loadedFromLegacy) setMigrationRecord({ migratedAt: new Date().toISOString(), boots: 1 });
    else if (!usedDefault) await recordBootAndMaybeDeleteLegacyDatabase();

    setIDBConnectionExists(idbError === null);
    const storage: StorageState = idbError
        ? { type: "unavailable", error: idbError }
        : usedDefault && !loadedFromLegacy
        ? { type: "empty" }
        : { type: "loaded" };

    return { manager, storage };
};

/**
 * Applying a value from storage dispatches into the store, which fires the same listeners a user
 * edit does. Without this flag every value arriving from another tab would be sent straight back
 * out again as a write. It is read synchronously, because the listener runs inside the reducer.
 */
let applyingFromStorage = false;
const applyValueFromStorage = (value: ListDataState) => {
    applyingFromStorage = true;
    try {
        TopHatDispatch(DataSlice.actions.setFromIndexedDB(value));
    } finally {
        applyingFromStorage = false;
    }
};

const describeSyncs = (syncs: Sync<DefaultTarget>[]): SyncDisplayState[] =>
    syncs.map((sync) => ({
        type: sync.target.type,
        name: sync.target instanceof DropboxTarget ? sync.target.user.name : undefined,
        email: sync.target instanceof DropboxTarget ? sync.target.user.email : undefined,
        desynced: sync.desynced === true,
    }));

const describeIDBFailure = (error: string) =>
    error === "OFFLINE"
        ? "TopHat could not open the browser's data store, perhaps because it is running in Private Browsing mode."
        : "TopHat could not read the browser's data store: " + error;

const countRows = (value: ListDataState) =>
    Object.values(value as unknown as Record<string, unknown[]>).reduce(
        (total, rows) => total + (rows?.length ?? 0),
        0
    );
