/**
 * The single personal-storage-wrapper manager that holds TopHat's data, and the pieces of its
 * configuration that are worth stating on their own: where the data lives, and which copy wins when
 * two of them disagree.
 *
 * The value it stores is a `ListDataState` - the same lists that `setFromIndexedDB` already takes -
 * so the shape saved by the old Dexie layer and the shape saved here are one and the same, and
 * `user.generation` goes on being the schema version.
 */

import { DefaultTarget, IndexedDBTarget, PersonalStorageManager, Sync, TimestampedValue } from "personal-storage-wrapper";
import type { ListDataState } from "../../data";
import { DataKeys, DataState, StubUserID } from "../../data/types";

/** BroadcastChannel name, and the row the data is stored under in every target */
export const STORAGE_ID = "tophat";

/** Where the list of targets, including any Dropbox refresh token, is kept */
export const SYNC_CONFIG_KEY = "tophat-syncs";

export type TopHatStorageManager = PersonalStorageManager<ListDataState>;

let manager: TopHatStorageManager | undefined;

export const setStorageManager = (value: TopHatStorageManager | undefined) => (manager = value);
export const getStorageManager = () => manager;

/** The lists that are saved, taken from the store in the order the entity adapters hold them */
export const toListDataState = (data: DataState): ListDataState =>
    Object.fromEntries(
        DataKeys.map((key) => [key, data[key].ids.map((id) => data[key].entities[id])])
    ) as unknown as ListDataState;

/** A fixed id, so that the data is findable even if the list of targets is lost */
export const getDefaultSyncs = async (): Promise<Sync<DefaultTarget>[]> => [
    { target: await IndexedDBTarget.create(STORAGE_ID), compressed: true },
];

export const getSyncData = () => localStorage.getItem(SYNC_CONFIG_KEY);
export const saveSyncData = (data: string) => localStorage.setItem(SYNC_CONFIG_KEY, data);

type SyncWithValue = { sync: Sync<DefaultTarget>; value: TimestampedValue<ListDataState> };

/**
 * Startup conflicts: the most recently written copy wins, and a remote one wins a tie.
 *
 * The library's own resolver prefers a remote target to the local one whatever their timestamps say,
 * which would let a Dropbox backup from last month overwrite edits made offline since.
 */
export const latestTimestampWins = async (
    _originalValue: ListDataState,
    currentValue: ListDataState,
    syncs: SyncWithValue[]
): Promise<ListDataState> => {
    const candidates = syncs.filter(({ value }) => value && value.value);
    if (!candidates.length) return currentValue;

    return candidates.reduce((best, candidate) => {
        const difference = candidate.value.timestamp.valueOf() - best.value.timestamp.valueOf();
        if (difference !== 0) return difference > 0 ? candidate : best;

        // Written at the same moment, so prefer whichever is not the browser's own copy
        return isLocalSync(candidate.sync) ? best : candidate;
    }).value.value;
};

/**
 * Update conflicts: what is in the browser wins, unless nothing has been done with it yet.
 *
 * Keeping the local value is what TopHat has always done - linking an account backs the browser's
 * data up rather than pulling the account's data down. The exception is a fresh install, where
 * keeping the local value would overwrite a real backup with the tutorial state.
 */
export const remoteWinsOverFreshInstall = async (
    localState: ListDataState,
    _syncs: Sync<DefaultTarget>[],
    conflicts: SyncWithValue[]
): Promise<ListDataState> => {
    if (!isFreshInstall(localState)) return localState;

    const remote = conflicts.find(({ sync, value }) => !isLocalSync(sync) && value && value.value);
    return remote ? remote.value.value : localState;
};

/** Nothing has been done with this install yet: the tutorial has not been dismissed */
const isFreshInstall = (value: ListDataState) => value.user.find(({ id }) => id === StubUserID)?.tutorial === true;

const isLocalSync = (sync: Sync<DefaultTarget>) => sync.target.type === "indexeddb";
