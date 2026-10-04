/** What became of the attempt to load saved data on boot */
export type StorageState =
    /** The app hasn't finished booting, and has yet to look for saved data */
    | { type: "loading" }
    /** Data was found in IndexedDB and is now in the store */
    | { type: "loaded" }
    /** IndexedDB works and holds no TopHat data, so this is a new install and can be written to */
    | { type: "empty" }
    /** IndexedDB can't be used at all, as in private browsing - nothing was lost, but nothing can be saved */
    | { type: "unavailable"; error: string }
    /** Data is in the browser but couldn't be read, so it must not be written over */
    | { type: "unreadable"; error: string; rescuedRows: number }
    /** Boot threw before the app could be shown - nothing suggests saved data is at fault, so it's left alone */
    | { type: "failed"; error: string }
    /** Saved copies of the data disagree, and only the user can say which to keep: nothing is saved until they do */
    | { type: "conflict"; copies: StorageCopy[] };

/** One of the copies offered when they disagree, described for the user to choose between */
export interface StorageCopy {
    /** What to pass to `chooseStorageCopy` to keep it */
    id: string;
    source: StorageCopySource;
    /** When it was saved where it is kept, by that place's own clock, as an ISO timestamp - if that place says */
    savedAt: string | null;
    summary: CopySummary;
}

export type StorageCopySource =
    /** The browser's own store, as the app holds it now */
    | { type: "browser" }
    /** A target other than the browser's store, by its type in the storage library */
    | { type: "remote"; target: string }
    /** The database a Dexie version of the app saved into, since this one copied out of it */
    | { type: "legacy" };

/** What a copy holds, as far as it helps to tell copies apart */
export interface CopySummary {
    accounts: number;
    transactions: number;
    /** The date of the latest transaction, as an SDate */
    latestTransaction: string | null;
    /** When the data was last changed, from the undo history, which only goes back thirty days */
    lastChanged: string | null;
    isDemo: boolean;
    /** Whether it holds anything of the user's own, rather than only the tutorial or the demo */
    holdsRealData: boolean;
}

/** A target other than the browser's store that the data is synced to, as the app shows it */
export interface RemoteSyncState {
    /** The target's type in the storage library: only "dropbox" is ever linked today */
    type: string;
    /** Whose account it is, where the target says */
    account: { name: string; email: string } | null;
    /**
     * Whether it holds the latest value saved here. It falls behind whenever a save doesn't reach it -
     * offline, failing, or because it changed elsewhere first - and catches up with the next save that does.
     */
    inStep: boolean;
    /** Whether the last save to it failed for some reason other than being offline */
    failing: boolean;
}

/** What startup keeps of the storage it booted from, so that it doesn't depend on how that storage works */
export interface StorageConnection {
    /** Handles on the underlying store, exposed alongside the other debug variables */
    debugVariables: Record<string, unknown>;
    /**
     * Whether storage has stopped saving for good, until the page is reloaded. That happens when, at any
     * point after the store opens, another tab saves data this one can't use: data from a newer version
     * of the app, or with no user in it. An ordinary change from another tab doesn't count. Storage then
     * puts the app on the recovery screen itself, but only after an async rescue, so boot checks this to
     * avoid replacing that screen with its own result.
     */
    hasFrozenForRecovery: () => boolean;
    /**
     * Whether nothing may be written anywhere, including a backup: storage has frozen for recovery, or
     * the user is choosing between copies that disagree.
     */
    isHoldingWrites: () => boolean;
}

/** Whether boot has got far enough for the app, and anything laid over it, to be shown */
export const isAppRunning = (state: StorageState): boolean => {
    switch (state.type) {
        case "loading":
        case "unreadable":
        case "failed":
        case "conflict":
            return false;
        case "loaded":
        case "empty":
        case "unavailable":
            return true;
    }
};
