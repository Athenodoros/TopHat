/**
 * The rules for saved copies of the data that disagree: whether one of them plainly supersedes the
 * others, or only the user can say which to keep.
 *
 * Everything here is pure. `store.ts` gathers the copies, and what the storage library knows of each
 * target's history, and `index.ts` asks the user when these rules can't decide.
 * None of it picks a copy just because it holds more, or holds real data where the other doesn't:
 * someone may well have deleted everything on purpose.
 */

import { maxBy } from "lodash-es";
import { getInitialTutorialLists, ListDataState } from "../../data";
import { StubUserID, Transaction, User } from "../../data/types";
import { ID } from "../../shared/values";
import { CopySummary } from "./types";

const getUser = (value: ListDataState) => ((value.user ?? []) as User[]).find(({ id }) => id === StubUserID);

/** The data's schema version, which a value with no generation predates */
export const getGeneration = (value: ListDataState) => getUser(value)?.generation ?? 0;

/**
 * Whether two values are the same once saved. Compared as they would be saved, so that a key that is
 * present but undefined - which saving drops - doesn't make a value look changed.
 */
export const isSameData = (left: ListDataState, right: ListDataState) =>
    left === right || JSON.stringify(left) === JSON.stringify(right);

/**
 * The lists that hold what the user put in. `user` is settings rather than data, and its two flags
 * are checked on their own; `notification` and `patches` are TopHat's own bookkeeping, and dismissing
 * the tutorial is itself enough to write a patch.
 */
const CONTENT_KEYS = ["account", "category", "currency", "institution", "rule", "transaction", "statement"] as const;

/**
 * Whether this is data the user would miss, rather than the tutorial or the demo.
 *
 * Not every list starts empty: a new install is given categories, a currency and an institution, all
 * placeholders, so length alone says nothing. What does is an id that a new install would not have,
 * which is why this compares against one rather than naming the lists that happen to start empty.
 *
 * The demo is a full set of accounts and transactions, so nothing counting rows could tell it apart
 * from the real thing. It is the user flag that says so.
 */
export const holdsRealData = (value: ListDataState): boolean => {
    const user = getUser(value);
    if (user === undefined || user.isDemo || user.tutorial) return false;

    const placeholders = getNewInstallIds();
    return CONTENT_KEYS.some((key) =>
        ((value[key] ?? []) as { id: ID }[]).some(({ id }) => !placeholders[key].has(id))
    );
};

/** What a brand new install holds, taken from the app rather than listed again here */
const getNewInstallIds = () => {
    const fresh = getInitialTutorialLists();
    return Object.fromEntries(
        CONTENT_KEYS.map((key) => [key, new Set((fresh[key] as { id: ID }[]).map(({ id }) => id))])
    ) as Record<(typeof CONTENT_KEYS)[number], Set<ID>>;
};

export const describeCopy = (value: ListDataState): CopySummary => {
    const transactions = (value.transaction ?? []) as Transaction[];
    return {
        accounts: (value.account ?? []).length,
        transactions: transactions.length,
        latestTransaction: maxBy(transactions, ({ date }) => date)?.date ?? null,
        lastChanged: maxBy(value.patches ?? [], ({ date }) => date)?.date ?? null,
        isDemo: getUser(value)?.isDemo ?? false,
        holdsRealData: holdsRealData(value),
    };
};

/**
 * Resolution
 */

/**
 * What the storage library knows of a target's history. Neither part compares one target's clock with
 * another's: each target's timestamps are only ever compared with earlier ones from the same target.
 */
export interface TargetHistory {
    /**
     * Whether something else has written to the target since this browser last wrote to it or read it
     * there, or null where it never has, so that there is no history to go on
     */
    movedOn: boolean | null;
    /** Whether a value saved here never reached the target, because the write failed or was refused */
    missedWrite: boolean;
}

/** A copy as a target holds it, with that target's own timestamp for when it was saved there */
export interface TargetCopy {
    timestamp: Date;
    value: ListDataState;
    history: TargetHistory;
}

export type Resolution = { type: "keep"; value: ListDataState } | { type: "choose" };

/** The most that the browser's clock and a remote's are assumed to differ by, when nothing else can decide */
export const CLOCK_TOLERANCE_MILLIS = 60 * 1000;

export interface Disagreement {
    /** The browser's store, or null if its copy couldn't be read */
    local: TargetCopy | null;
    remotes: TargetCopy[];
    /** The value the app loaded, before the other copies were read */
    original: ListDataState;
    /** The value the app holds now, which may include changes made since it loaded */
    live: ListDataState;
    /**
     * What to do where a target has no history. When the app starts, the timestamps are the best there
     * is. A remote with no history found any later has just been added, which the code adding it is
     * expected to have settled already - so there, only the user can say.
     */
    withoutHistory: "timestamps" | "choose";
}

/**
 * Which copy wins, if any plainly does.
 *
 * A copy has changed since the two last agreed if something else has written to its target since, or
 * if a value saved here reached its target but not the other's. One that has changed wins over one
 * that hasn't. Where both have, or neither has but they still differ, only the user can say. Where
 * there is no history to say, timestamps from the two clocks are compared, and the browser's copy is
 * kept unless the remote one is clearly newer.
 */
export const resolveCopies = ({ local, remotes, original, live, withoutHistory }: Disagreement): Resolution => {
    if (local === null) return { type: "choose" };

    const differing = remotes.filter((remote) => !isSameData(remote.value, local.value));
    const verdicts = differing.map((remote) => getVerdict(local, remote, withoutHistory));
    if (verdicts.includes("choose")) return { type: "choose" };

    // Every remote that has moved on has to agree on where to: one that hasn't is simply behind
    const newer = differing.filter((_, index) => verdicts[index] === "remote");
    if (newer.some((remote) => !isSameData(remote.value, newer[0].value))) return { type: "choose" };

    return keepUnlessChangedSinceLoading(newer.length ? newer[0].value : local.value, original, live);
};

const getVerdict = (
    local: TargetCopy,
    remote: TargetCopy,
    withoutHistory: Disagreement["withoutHistory"]
): "local" | "remote" | "choose" => {
    if (local.history.movedOn === null || remote.history.movedOn === null) {
        if (withoutHistory === "choose") return "choose";
        return remote.timestamp.valueOf() - local.timestamp.valueOf() > CLOCK_TOLERANCE_MILLIS ? "remote" : "local";
    }

    const localChanged = local.history.movedOn || remote.history.missedWrite;
    const remoteChanged = remote.history.movedOn || local.history.missedWrite;
    if (localChanged === remoteChanged) return "choose";
    return remoteChanged ? "remote" : "local";
};

/**
 * The app may have been changed since it loaded, while the other copies were being read. Keeping the
 * copy it loaded keeps those changes. Keeping another copy loses them, which is only for the user to
 * decide, unless there are none.
 */
const keepUnlessChangedSinceLoading = (winner: ListDataState, original: ListDataState, live: ListDataState) =>
    isSameData(winner, original)
        ? ({ type: "keep", value: live } as const)
        : isSameData(live, original)
        ? ({ type: "keep", value: winner } as const)
        : ({ type: "choose" } as const);

/**
 * The copies to offer the user, without repeats. The one the app loaded is offered as the app holds it
 * now, and marked `isLive`, so that choosing it keeps any changes made since - including while the
 * user was choosing.
 */
export const getChoices = <C extends { value: ListDataState }>(
    copies: C[],
    original: ListDataState,
    live: ListDataState
): (C & { isLive: boolean })[] =>
    copies
        .map((copy) =>
            isSameData(copy.value, original) ? { ...copy, value: live, isLive: true } : { ...copy, isLive: false }
        )
        .filter((copy, index, all) => all.findIndex((other) => isSameData(other.value, copy.value)) === index);
