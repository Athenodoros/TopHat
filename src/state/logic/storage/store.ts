/**
 * The store TopHat saves into: a personal-storage-wrapper manager holding the whole of the data as
 * one value, the lists that `setFromStorage` takes, compressed into a single IndexedDB row.
 *
 * This is the only module that knows about the library. Boot, in `index.ts`, decides what the value
 * should be and what counts as usable, and keeps the store and Redux in step.
 *
 * Today the browser's store is the only target, but the library can hold more, and TopHat's rules for
 * copies that disagree are wired in already: see `conflicts.ts`. The library's own rules would let one
 * copy silently write over another.
 */

import {
    DefaultTarget,
    ErrorResult,
    getSyncDataFromLocalStorage,
    IndexedDBTarget,
    NewSync,
    PersonalStorageManager,
    Sync,
    TimestampedValue,
} from "personal-storage-wrapper";
import type { ListDataState } from "../../data";
import { Disagreement, getChoices, LocalCopy, resolveCopies, TargetCopy, TargetHistory } from "./conflicts";
import { StorageCopySource } from "./types";

/** The manager's id, which names its broadcast channel and its list of targets, and the key of the row the data is saved under */
export const STORE_ID = "tophat";

/** What there was of a value that couldn't be used: what it decoded to, or its bytes where it didn't decode */
export type UnusableContents = { type: "value"; value: unknown } | { type: "raw"; raw: ArrayBuffer | null };

/**
 * The store couldn't be read when it was opened. Nothing has been written to it. It is `unavailable`
 * where it couldn't be opened at all and never has been, so that there is nothing in it to lose.
 */
export class StoreReadError extends Error {
    constructor(message: string, readonly unavailable: boolean, readonly contents: UnusableContents) {
        super(message);
    }
}

/** A copy offered to the user when the targets disagree */
export interface StoreCopy {
    source: Exclude<StorageCopySource, { type: "legacy" }>;
    /** When it was saved where it is kept, by that target's own clock */
    timestamp: Date | null;
    value: ListDataState;
    /** Whether this is the value the app holds, which choosing it keeps as the app holds it then */
    isLive: boolean;
}

export interface StoreCallbacks {
    /** Only called when the store is empty. Anything it throws is thrown by `openStore`, with nothing written. */
    getInitialValue: () => Promise<ListDataState>;
    /** Why a value can't be used, or null if it can: every value read, or sent by another tab, is checked */
    validate: (value: unknown) => string | null;
    /** A value that arrived from elsewhere - another tab, today - once the store is open */
    onExternalValue: (value: ListDataState) => void;
    /** A value that can't be used arrived once the store was open. The store has already stopped saving. */
    onUnusableValue: (problem: string, contents: UnusableContents) => void;
    /** Whether the last write to the browser's store worked, or it has stopped being written to */
    onSaveStatus: (working: boolean) => void;
    /** The value the app holds now, which may include changes that have yet to be saved */
    getLiveValue: () => ListDataState;
    /**
     * The targets disagree, and nothing says which copy supersedes the others. Resolves to the value of
     * the copy the user keeps, and until then the library writes nothing. It may never resolve.
     */
    chooseCopy: (copies: StoreCopy[]) => Promise<ListDataState>;
}

export interface Store {
    /** The latest value, which is the one to load: another tab may have saved since it was read */
    getValue: () => ListDataState;
    /** Whether that value was read from the store, rather than made by `getInitialValue` */
    loadedFromStore: boolean;
    /** Resolves to whether the browser's copy now holds the value */
    save: (value: ListDataState) => Promise<boolean>;
    close: () => void;
    debugVariables: Record<string, unknown>;
}

/**
 * Opens the store. The library never writes over a value it couldn't read or that failed `validate`,
 * so a store that can't be used is reported by throwing a `StoreReadError`, and nothing in it changes.
 */
export const openStore = async (callbacks: StoreCallbacks): Promise<Store> => {
    let opened = false;
    let refusedOnStartup: ErrorResult | null = null;

    const { manager, startSource, syncsSource } = await PersonalStorageManager.create<ListDataState>(
        callbacks.getInitialValue,
        {
            id: STORE_ID,
            getDefaultSyncs,
            validate: callbacks.validate,

            // Other tabs' changes come over the broadcast channel, and there is nothing else to poll
            pollPeriodInSeconds: null,

            // With a single target, this is every failure to read it: the library would otherwise carry on
            // with the initial value, which here would copy the old database over a store that has data
            handleAllEmptyAndFailedSyncsOnStartup: async (results) => {
                throw getReadError(results.find(({ value }) => value.type === "error")!.value as ErrorResult);
            },

            // A refusal during startup is thrown once the manager is created: with more than one target,
            // the others may have been read without one. Afterwards, nothing more is saved.
            onUnreadableValue: (error) => {
                if (!opened) {
                    refusedOnStartup ??= error;
                    return;
                }

                manager.close();
                callbacks.onUnusableValue(error.detail ?? error.error, getContents(error));
            },

            onValueUpdate: (value, origin) => {
                if (!opened || origin === "CREATION" || origin === "LOCAL") return;
                callbacks.onExternalValue(value);
            },

            // Both are decided by `conflicts.ts`, from what the library knows of each target's history. When
            // the app starts, the browser's copy is the one read from its store. Afterwards, it is the value
            // the manager holds, which was last saved to the store when the store last saw a write.
            // TopHat's handlers return the value to keep from its own live state, so they don't need the
            // manager's.
            resolveConflictingSyncValuesOnStartup: (original, _getCurrentValue, syncs) => {
                const local = syncs.find(({ sync }) => isLocalSync(sync));
                return resolveConflict(
                    original,
                    local ? { type: "known", copy: toCopy(local.sync, local.value) } : { type: "unknown" },
                    syncs.filter(({ sync }) => !isLocalSync(sync)),
                    "timestamps"
                );
            },
            resolveConflictingSyncsUpdate: (value, syncs, conflicts) => {
                const local = syncs.find(isLocalSync);
                return resolveConflict(
                    value,
                    // A browser copy that has itself changed underneath the manager can't be described here
                    local?.lastProcessedWriteTime && !conflicts.some(({ sync }) => isLocalSync(sync))
                        ? {
                              type: "known",
                              copy: toCopy(local, { timestamp: new Date(local.lastProcessedWriteTime), value }),
                          }
                        : { type: "unknown" },
                    conflicts,
                    "choose"
                );
            },

            // The store is behind if its last write failed, and until one works
            onSyncStatesUpdate: (syncs) => {
                const local = syncs.find(isLocalSync);
                if (local) callbacks.onSaveStatus(local.status.type === "IN_STEP");
            },
            handleSyncOperationLog: ({ sync, operation, stage }) => {
                if (!isLocalSync(sync) || operation !== "UPLOAD") return;
                if (stage === "SUCCESS") callbacks.onSaveStatus(true);
                if (stage === "ERROR" || stage === "OFFLINE") callbacks.onSaveStatus(false);
            },
        }
    );
    opened = true;

    if (refusedOnStartup !== null) {
        manager.close();
        throw getReadError(refusedOnStartup);
    }

    /** Settles a disagreement by the rules, or by asking the user where they can't */
    async function resolveConflict(
        original: ListDataState,
        local: LocalCopy,
        remotes: { sync: Sync<DefaultTarget>; value: TimestampedValue<ListDataState> }[],
        withoutHistory: Disagreement["withoutHistory"]
    ) {
        const remoteCopies = remotes.map(({ sync, value }) => ({
            ...toCopy(sync, value),
            source: { type: "remote", target: sync.target.type } as const,
        }));
        const live = callbacks.getLiveValue();

        const resolution = resolveCopies({ local, remotes: remoteCopies, original, live, withoutHistory });
        if (resolution.type === "keep") return resolution.value;

        const copies =
            local.type === "known"
                ? [{ ...local.copy, source: { type: "browser" } as const }, ...remoteCopies]
                : remoteCopies;
        return callbacks.chooseCopy(getChoices(copies, original, live));
    }

    return {
        getValue: manager.getValue,
        loadedFromStore: startSource === "TARGET",
        save: async (value) => (await manager.setValue(value)).saved.some(isLocalSync),
        close: manager.close,
        // Only the local target is ever saved, so a list of targets that couldn't be read loses nothing
        // worth telling the user about - but it is worth being able to see
        debugVariables: { manager, syncsSource },
    };
};

/** Removes the saved row and the list of targets, for the recovery screen */
export const clearStore = async () => {
    const result = await IndexedDBTarget.clear(STORE_ID);
    if (result.type === "error")
        throw new Error(
            "TopHat could not clear the browser's data store" + (result.detail ? ": " + result.detail : ".")
        );

    PersonalStorageManager.clearSyncData(STORE_ID);
};

/** A fixed id, so that the data is found in the same row even if the list of targets is lost */
const getDefaultSyncs = async (): Promise<NewSync<DefaultTarget>[]> => [
    { target: await IndexedDBTarget.create(STORE_ID), compressed: true },
];

/** The browser's store is the IndexedDB target with TopHat's id: any other target is somewhere else */
const isLocalSync = (sync: Sync<DefaultTarget>) =>
    sync.target instanceof IndexedDBTarget && sync.target.serialise().id === STORE_ID;

/**
 * A target's copy, with what the library knows of the target's history. Its last processed write time
 * is that target's own timestamp for the last value it wrote there or read from there, so comparing the
 * two says whether anything else has written to it since.
 */
const toCopy = (sync: Sync<DefaultTarget>, { timestamp, value }: TimestampedValue<ListDataState>): TargetCopy => {
    const history: TargetHistory =
        sync.lastProcessedWriteTime === undefined
            ? { type: "none" }
            : {
                  type: "known",
                  movedOn: timestamp.valueOf() !== new Date(sync.lastProcessedWriteTime).valueOf(),
                  missedWrite: sync.status.type !== "IN_STEP",
              };
    return { timestamp, value, history };
};

const UNAVAILABLE_MESSAGE =
    "TopHat could not open the browser's data store, perhaps because it is running in Private Browsing mode.";
const USED_BUT_UNAVAILABLE_MESSAGE =
    "TopHat could not open the browser's data store, although it has saved data there before.";

/**
 * Whether a manager has opened the store in this browser before: every one that does saves its list of
 * targets. A store that can't be opened then may well hold data, and must not look like a new install.
 */
const hasBeenOpenedBefore = () => getSyncDataFromLocalStorage(STORE_ID) !== null;

const getReadError = (error: ErrorResult) => {
    if (error.error === "OFFLINE")
        return hasBeenOpenedBefore()
            ? new StoreReadError(USED_BUT_UNAVAILABLE_MESSAGE, false, { type: "raw", raw: null })
            : new StoreReadError(UNAVAILABLE_MESSAGE, true, { type: "raw", raw: null });

    // A value that decoded but failed validation is described by the validation itself
    const message =
        error.error !== "CORRUPT_VALUE"
            ? "TopHat could not read the browser's data store: " + (error.detail ?? error.error)
            : error.decoded !== undefined
            ? error.detail ?? "The saved data can't be used."
            : "The saved data is damaged, and could not be decoded" + (error.detail ? ": " + error.detail : ".");

    return new StoreReadError(message, false, getContents(error));
};

const getContents = ({ decoded, buffer }: ErrorResult): UnusableContents =>
    decoded !== undefined ? { type: "value", value: decoded } : { type: "raw", raw: buffer ?? null };
