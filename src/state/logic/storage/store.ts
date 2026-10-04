/**
 * The store TopHat saves into: a personal-storage-wrapper manager holding the whole of the data as
 * one value, the lists that `setFromStorage` takes, compressed into a single IndexedDB row.
 *
 * This is the only module that knows about the library's manager. Boot, in `index.ts`, decides what
 * the value should be and what counts as usable, and keeps the store and Redux in step.
 *
 * The browser's store is always one target, and a Dropbox account can be another (`dropbox.ts` links
 * it). TopHat's own rules settle copies that disagree: see `conflicts.ts`. The library's would let one
 * copy silently write over another.
 */

import {
    DefaultTarget,
    DropboxTarget,
    ErrorResult,
    getSyncDataFromLocalStorage,
    IndexedDBTarget,
    PersonalStorageManager,
    Sync,
    TimestampedValue,
} from "personal-storage-wrapper";
import type { ListDataState } from "../../data";
import { Disagreement, getChoices, isSameData, resolveCopies, TargetCopy, TargetHistory } from "./conflicts";
import { RemoteSyncState, StorageCopySource } from "./types";

/** The manager's id, which names its broadcast channel and its list of targets, and the key of the row the data is saved under */
export const STORE_ID = "tophat";

/** What there was of a value that couldn't be used: what it decoded to, or its bytes where it didn't decode */
export type UnusableContents = { type: "value"; value: unknown } | { type: "raw"; raw: ArrayBuffer | null };

/** The browser's store couldn't be read when it was opened, and may hold data. Nothing has been written to it. */
export class StoreReadError extends Error {
    constructor(message: string, readonly contents: UnusableContents) {
        super(message);
    }
}

/**
 * A remote target couldn't be read when the store was opened, and the browser's store holds nothing
 * to start from. Starting from anything else would put it in place of what the remote holds, so this
 * is a reason to try again, not to offer to delete anything: nothing has been written anywhere.
 */
export class RemoteReadError extends Error {}

/** How often a store with a remote target looks for changes made to it elsewhere */
export const REMOTE_POLL_SECONDS = 60;

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
    /**
     * What to start from when the browser's store can't be opened at all and nothing says it holds
     * anything, as in some private browsing modes. Nothing is ever saved in the browser then.
     */
    getUnavailableValue: () => ListDataState;
    /** Why a value can't be used, or null if it can: every value read, or sent by another tab, is checked */
    validate: (value: unknown) => string | null;
    /** A value that arrived from elsewhere - another tab, today - once the store is open */
    onExternalValue: (value: ListDataState) => void;
    /** A value that can't be used arrived once the store was open. The store has already stopped saving. */
    onUnusableValue: (problem: string, contents: UnusableContents) => void;
    /** Whether the last write to the browser's store worked, or it has stopped being written to */
    onSaveStatus: (working: boolean) => void;
    /** How the remote targets stand, whenever that may have changed */
    onRemoteStatus: (remotes: RemoteSyncState[]) => void;
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
    /** Whether that value was read from a target, rather than made by `getInitialValue` */
    loadedFromStore: boolean;
    /** Why nothing can be saved in the browser, if the store there couldn't be opened, or null */
    unavailable: string | null;
    /** Resolves to whether the browser's copy now holds the value */
    save: (value: ListDataState) => Promise<boolean>;
    /**
     * Starts syncing to a remote target, which the caller has already read. If it still holds the
     * value it is given to supersede, the value the app holds replaces it: that is what the caller
     * decided when it read the target. Any other value there is settled by the usual rules, which
     * know nothing of the target yet, and so ask the user.
     */
    addRemote: (target: DefaultTarget, superseding: ListDataState | null) => Promise<void>;
    /** Stops syncing to every remote target of a type. The browser's own store is never removed. */
    removeRemotes: (type: string) => Promise<void>;
    hasRemote: (type: string) => boolean;
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
    let unavailable: string | null = null;

    // Remote targets whose last request failed, other than for being offline, until one succeeds
    let failing: DefaultTarget[] = [];
    // Values in remote targets that the app's value replaces, as decided when each target was linked
    let superseded: { target: DefaultTarget; value: ListDataState }[] = [];
    let reportRemotes = (_syncs: Sync<DefaultTarget>[]) => {};

    const { manager, startSource, syncsSource } = await PersonalStorageManager.create<ListDataState>(
        callbacks.getInitialValue,
        {
            id: STORE_ID,
            getDefaultSyncs,
            getSyncData: () => withLocalTarget(getSyncDataFromLocalStorage(STORE_ID)),
            validate: callbacks.validate,

            // Other tabs' changes come over the broadcast channel. Remote targets are polled, from once
            // one is listed, so that a change made on another device is found before it is written over.
            pollPeriodInSeconds: null,

            // Every target was empty or failed. If a remote failed, what it holds is unknown, and the
            // initial value would take its place. If the browser's store failed, the library would carry
            // on with the initial value, which here would copy the old database over a store that has data.
            handleAllEmptyAndFailedSyncsOnStartup: async (results) => {
                // A value that was refused goes to the recovery screen, wherever it was found
                if (refusedOnStartup !== null) throw getReadError(refusedOnStartup);

                const remote = results.find(({ sync, value }) => !isLocalSync(sync) && value.type === "error");
                if (remote) throw getRemoteReadError(remote.sync, remote.value as ErrorResult);

                const local = results.find(({ sync, value }) => isLocalSync(sync) && value.type === "error");
                const error = (local?.value ??
                    results.find(({ value }) => value.type === "error")!.value) as ErrorResult;
                if (error.error === "OFFLINE" && !mayHoldData()) {
                    unavailable = UNAVAILABLE_MESSAGE;
                    return { behaviour: "VALUE", value: callbacks.getUnavailableValue() };
                }

                throw getReadError(error);
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
                    local ? toCopy(local.sync, local.value) : null,
                    syncs.filter(({ sync }) => !isLocalSync(sync)),
                    "timestamps"
                );
            },
            resolveConflictingSyncsUpdate: async (value, syncs, conflicts) => {
                // A remote still holding what the app decided to replace when it was linked is replaced
                const unsettled = conflicts.filter(
                    ({ sync, value }) =>
                        !superseded.some((old) => old.target.equals(sync.target) && isSameData(old.value, value.value))
                );
                if (unsettled.length === 0) return callbacks.getLiveValue();

                const local = syncs.find(isLocalSync);
                return resolveConflict(
                    value,
                    // A browser copy that has itself changed underneath the manager can't be described here
                    local?.lastSeenWriteTime && !unsettled.some(({ sync }) => isLocalSync(sync))
                        ? toCopy(local, { timestamp: new Date(local.lastSeenWriteTime), value })
                        : null,
                    unsettled,
                    "choose"
                );
            },

            // The store missed a write if its last one failed, and until one works
            onSyncStatesUpdate: (syncs) => {
                const local = syncs.find(isLocalSync);
                if (local) callbacks.onSaveStatus(local.missedWrite !== true);
                reportRemotes(syncs);
            },
            handleSyncOperationLog: ({ sync, operation, stage }) => {
                if (isLocalSync(sync)) {
                    if (operation !== "UPLOAD") return;
                    if (stage === "SUCCESS") callbacks.onSaveStatus(true);
                    if (stage === "ERROR" || stage === "OFFLINE") callbacks.onSaveStatus(false);
                    return;
                }

                // Only a save says whether a remote is failing. Being offline isn't failing: the remote catches up
                // with the first save once it's back. A check before a save that worked doesn't mean the save
                // will, and taking it to would flip the warning, which is itself a change to save, on every save.
                if (operation !== "UPLOAD") return;
                if (stage === "ERROR" && !failing.some((target) => target.equals(sync.target))) {
                    failing = [...failing, sync.target];
                    if (opened) reportRemotes(manager.getSyncsState());
                }
                if (stage === "SUCCESS" && failing.some((target) => target.equals(sync.target))) {
                    failing = failing.filter((target) => !target.equals(sync.target));
                    if (opened) reportRemotes(manager.getSyncsState());
                }
            },
        }
    );
    opened = true;

    if (refusedOnStartup !== null) {
        manager.close();
        throw getReadError(refusedOnStartup);
    }

    // Polling only runs while there is a remote to poll: the browser's store hears of other tabs' saves
    reportRemotes = (syncs) => {
        const remotes = syncs.filter((sync) => !isLocalSync(sync));
        manager.config.pollPeriodInSeconds = remotes.length ? REMOTE_POLL_SECONDS : null;
        callbacks.onRemoteStatus(
            remotes.map((sync) =>
                describeRemote(
                    sync,
                    failing.some((target) => target.equals(sync.target))
                )
            )
        );
    };
    reportRemotes(manager.getSyncsState());

    /** Settles a disagreement by the rules, or by asking the user where they can't */
    async function resolveConflict(
        original: ListDataState,
        local: TargetCopy | null,
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

        const copies = local ? [{ ...local, source: { type: "browser" } as const }, ...remoteCopies] : remoteCopies;
        return callbacks.chooseCopy(getChoices(copies, original, live));
    }

    return {
        getValue: manager.getValue,
        loadedFromStore: startSource === "TARGET",
        unavailable,
        save: async (value) => (await manager.setValue(value)).saved.some(isLocalSync),
        addRemote: (target, superseding) => {
            if (superseding !== null) superseded = [...superseded, { target, value: superseding }];
            return manager.addTarget(target);
        },
        removeRemotes: async (type) => {
            const removed = manager.getSyncsState().filter((sync) => !isLocalSync(sync) && sync.target.type === type);
            superseded = superseded.filter(({ target }) => !removed.some((sync) => sync.target.equals(target)));
            failing = failing.filter((target) => !removed.some((sync) => sync.target.equals(target)));
            await Promise.all(removed.map((sync) => manager.removeSync(sync)));
        },
        hasRemote: (type) => manager.getSyncsState().some((sync) => !isLocalSync(sync) && sync.target.type === type),
        close: manager.close,
        // A list of targets that couldn't be read loses any remote listed in it, and is worth being able to see
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
const getDefaultSyncs = async (): Promise<Sync<DefaultTarget>[]> => [
    { target: await IndexedDBTarget.create(STORE_ID), compressed: true },
];

/** The browser's store is the IndexedDB target with TopHat's id: any other target is somewhere else */
const isLocalSync = (sync: Sync<DefaultTarget>) =>
    sync.target instanceof IndexedDBTarget && sync.target.serialise().id === STORE_ID;

/** A saved list of targets, as the library writes it: each target's type, and its sync as JSON */
type SavedTargets = { type: string; config: string }[];

const parseSavedTargets = (saved: string) =>
    (JSON.parse(saved) as SavedTargets).map(({ type, config }) => ({ type, sync: JSON.parse(config) }));

const isSavedLocalTarget = ({ type, sync }: ReturnType<typeof parseSavedTargets>[number]) =>
    type === "indexeddb" && sync?.target?.id === STORE_ID;

/**
 * The saved list of targets, with the browser's store put back in if it has gone missing. A list
 * without it would leave the app saving nowhere in the browser, and never reading what is there. A
 * list that can't be read is left as it is: the library replaces it with the defaults.
 */
const withLocalTarget = (saved: string | null) => {
    if (saved === null) return null;

    try {
        if (parseSavedTargets(saved).some(isSavedLocalTarget)) return saved;

        const local = { type: "indexeddb", config: JSON.stringify({ target: { id: STORE_ID }, compressed: true }) };
        return JSON.stringify([local, ...(JSON.parse(saved) as SavedTargets)]);
    } catch {
        return saved;
    }
};

/**
 * Whether the browser's store may hold data, going by the saved list of targets: if the library has
 * ever written to it or read a value from it, or the data is synced somewhere else too. A store that
 * can't be opened then must not look like a new install. A list that can't be read may say either.
 */
const mayHoldData = () => {
    const saved = getSyncDataFromLocalStorage(STORE_ID);
    if (saved === null) return false;

    try {
        return parseSavedTargets(saved).some(
            (target) => !isSavedLocalTarget(target) || (target.sync.lastSeenWriteTime ?? null) !== null
        );
    } catch {
        return true;
    }
};

/** A remote target, for the app to show */
const describeRemote = (sync: Sync<DefaultTarget>, failing: boolean): RemoteSyncState => ({
    type: sync.target.type,
    account:
        sync.target instanceof DropboxTarget ? { name: sync.target.user.name, email: sync.target.user.email } : null,
    inStep: sync.missedWrite !== true && sync.unreadable !== true,
    failing,
});

const REMOTE_NAMES: Record<string, string> = { dropbox: "Dropbox", gdrive: "Google Drive" };

const getRemoteReadError = (sync: Sync<DefaultTarget>, error: ErrorResult) => {
    const name = REMOTE_NAMES[sync.target.type] ?? "a remote copy";
    return new RemoteReadError(
        (error.error === "OFFLINE" ? `TopHat could not reach ${name}` : `TopHat could not read the data in ${name}`) +
            `, and there is no data saved in this browser to start from instead. Nothing has been changed.` +
            (error.detail ? ` (${error.detail})` : "")
    );
};

/**
 * A target's copy, with what the library knows of the target's history. Its last seen write time is
 * that target's own timestamp for the last value it wrote there or read from there, so comparing the
 * two says whether anything else has written to it since. One with no last seen write time has no
 * history to say.
 */
const toCopy = (sync: Sync<DefaultTarget>, { timestamp, value }: TimestampedValue<ListDataState>): TargetCopy => {
    const history: TargetHistory = {
        movedOn:
            sync.lastSeenWriteTime === undefined
                ? null
                : timestamp.valueOf() !== new Date(sync.lastSeenWriteTime).valueOf(),
        missedWrite: sync.missedWrite === true,
    };
    return { timestamp, value, history };
};

const UNAVAILABLE_MESSAGE =
    "TopHat could not open the browser's data store, perhaps because it is running in Private Browsing mode.";
const USED_BUT_UNAVAILABLE_MESSAGE =
    "TopHat could not open the browser's data store, although it has saved data there before.";

const getReadError = (error: ErrorResult) => {
    if (error.error === "OFFLINE") return new StoreReadError(USED_BUT_UNAVAILABLE_MESSAGE, { type: "raw", raw: null });

    // A value that decoded but failed validation is described by the validation itself
    const message =
        error.error !== "CORRUPT_VALUE"
            ? "TopHat could not read the browser's data store: " + (error.detail ?? error.error)
            : error.decoded !== undefined
            ? error.detail ?? "The saved data can't be used."
            : "The saved data is damaged, and could not be decoded" + (error.detail ? ": " + error.detail : ".");

    return new StoreReadError(message, getContents(error));
};

const getContents = ({ decoded, buffer }: ErrorResult): UnusableContents =>
    decoded !== undefined ? { type: "value", value: decoded } : { type: "raw", raw: buffer ?? null };
