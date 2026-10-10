/**
 * The rules for copies of the data that disagree, without any storage: which copy wins, when only the
 * user can say, and what counts as data the user would miss. `index.test.ts` covers the same rules
 * wired into the store.
 *
 * @vitest-environment jsdom
 */

import { describe, expect, test } from "vitest";
import { getInitialTutorialLists, ListDataState } from "../../data";
import {
    CLOCK_TOLERANCE_MILLIS,
    describeCopy,
    Disagreement,
    getChoices,
    holdsRealData,
    resolveCopies,
    TargetCopy,
    TargetHistory,
} from "./conflicts";
import { STime } from "../../shared/values";
import { Coffee, getSavedData } from "./legacy/fixtures.testing";

const SAVED = new Date("2026-09-01T10:00:00Z");
const LATER = new Date("2026-09-02T10:00:00Z");

/** Each copy differs from the others by one transaction's reference */
const withReference = (reference: string): ListDataState => ({
    ...getSavedData(),
    transaction: [{ ...Coffee, reference }],
});
const Agreed = withReference("AGREED");
const LocalEdit = withReference("LOCAL");
const RemoteEdit = withReference("REMOTE");

type KnownHistory = Extract<TargetHistory, { type: "known" }>;
const NO_HISTORY = { type: "none" } as const;

/** A copy whose target nothing else has written to, and which has missed nothing, unless a test says so */
const copy = (
    value: ListDataState,
    history: Partial<KnownHistory> | typeof NO_HISTORY = {},
    timestamp: Date = SAVED
): TargetCopy => ({
    timestamp,
    value,
    history: history.type === "none" ? history : { type: "known", movedOn: false, missedWrite: false, ...history },
});

/** A browser copy and one remote copy, with the app having loaded the browser's and changed nothing since */
const disagreement = (local: TargetCopy, remote: TargetCopy, options: Partial<Disagreement> = {}): Disagreement => ({
    local: { type: "known", copy: local },
    remotes: [remote],
    original: local.value,
    live: local.value,
    withoutHistory: "timestamps",
    ...options,
});

describe("Resolving copies that disagree", () => {
    test("takes the remote copy when something else has written to it, and nothing to the browser's", () => {
        const resolution = resolveCopies(disagreement(copy(Agreed), copy(RemoteEdit, { movedOn: true })));
        expect(resolution).toEqual({ type: "keep", value: RemoteEdit });
    });

    test("keeps the browser's copy when only it has moved on, with any changes the app has made since", () => {
        const live = withReference("LIVE");
        const resolution = resolveCopies(disagreement(copy(LocalEdit, { movedOn: true }), copy(Agreed), { live }));
        expect(resolution).toEqual({ type: "keep", value: live });
    });

    test("keeps the browser's copy when a save reached it but not the remote", () => {
        const resolution = resolveCopies(disagreement(copy(LocalEdit), copy(Agreed, { missedWrite: true })));
        expect(resolution).toEqual({ type: "keep", value: LocalEdit });
    });

    test("takes the remote copy when a save reached it but not the browser's", () => {
        const resolution = resolveCopies(disagreement(copy(Agreed, { missedWrite: true }), copy(RemoteEdit)));
        expect(resolution).toEqual({ type: "keep", value: RemoteEdit });
    });

    test("asks when both have moved on", () => {
        const resolution = resolveCopies(
            disagreement(copy(LocalEdit), copy(RemoteEdit, { movedOn: true, missedWrite: true }))
        );
        expect(resolution).toEqual({ type: "choose" });
    });

    test("asks when neither has moved on, but they still differ", () => {
        const resolution = resolveCopies(disagreement(copy(LocalEdit), copy(RemoteEdit)));
        expect(resolution).toEqual({ type: "choose" });
    });

    test("asks rather than lose changes made since loading the copy that lost", () => {
        // The app loaded the browser's copy and was changed, but the remote's has moved on since
        const resolution = resolveCopies(
            disagreement(copy(Agreed), copy(RemoteEdit, { movedOn: true }), { live: withReference("LIVE") })
        );
        expect(resolution).toEqual({ type: "choose" });
    });

    test("never compares one clock's timestamps with the other's when there is history", () => {
        // The remote's clock is a day behind, but it has moved on and the browser's copy hasn't
        const behind = new Date(SAVED.valueOf() - 24 * 60 * 60 * 1000);
        const resolution = resolveCopies(disagreement(copy(Agreed), copy(RemoteEdit, { movedOn: true }, behind)));
        expect(resolution).toEqual({ type: "keep", value: RemoteEdit });
    });

    describe("without history", () => {
        const withoutHistory = (remoteTimestamp: Date, options: Partial<Disagreement> = {}) =>
            resolveCopies(disagreement(copy(LocalEdit), copy(RemoteEdit, NO_HISTORY, remoteTimestamp), options));

        test("keeps the browser's copy unless the remote one is more than a minute newer", () => {
            const withinTolerance = new Date(SAVED.valueOf() + CLOCK_TOLERANCE_MILLIS);
            expect(withoutHistory(withinTolerance)).toEqual({ type: "keep", value: LocalEdit });

            const older = new Date(SAVED.valueOf() - CLOCK_TOLERANCE_MILLIS * 10);
            expect(withoutHistory(older)).toEqual({ type: "keep", value: LocalEdit });
        });

        test("takes the remote copy when it is more than a minute newer", () => {
            const newer = new Date(SAVED.valueOf() + CLOCK_TOLERANCE_MILLIS + 1);
            expect(withoutHistory(newer)).toEqual({ type: "keep", value: RemoteEdit });
        });

        test("falls back on the timestamps when it is the browser's copy that has none", () => {
            const resolution = resolveCopies(
                disagreement(copy(LocalEdit, NO_HISTORY), copy(RemoteEdit, { movedOn: true }, LATER))
            );
            expect(resolution).toEqual({ type: "keep", value: RemoteEdit });
        });

        test("asks, for a disagreement found after startup", () => {
            expect(withoutHistory(LATER, { withoutHistory: "choose" })).toEqual({ type: "choose" });
        });
    });

    test("ignores a remote copy that agrees with the browser's, whatever its history says", () => {
        const resolution = resolveCopies(disagreement(copy(Agreed), copy(Agreed, { movedOn: true })));
        expect(resolution).toEqual({ type: "keep", value: Agreed });
    });

    test("asks when the browser's copy couldn't be read", () => {
        const base = disagreement(copy(Agreed), copy(RemoteEdit, { movedOn: true }));
        expect(resolveCopies({ ...base, local: { type: "unknown" } })).toEqual({ type: "choose" });
    });
});

describe("Offering copies to choose between", () => {
    test("offers the copy the app loaded as the app holds it now, and each copy only once", () => {
        const live = withReference("LIVE");
        const choices = getChoices(
            [
                { name: "browser", value: LocalEdit },
                { name: "first", value: RemoteEdit },
                { name: "second", value: withReference("REMOTE") },
            ],
            LocalEdit,
            live
        );

        expect(choices).toEqual([
            { name: "browser", value: live, isLive: true },
            { name: "first", value: RemoteEdit, isLive: false },
        ]);
    });
});

describe("Telling real data from data that can go", () => {
    test("a new install holds nothing of the user's", () => {
        expect(holdsRealData(getInitialTutorialLists())).toBe(false);
        expect(
            holdsRealData({ ...getInitialTutorialLists(), user: [{ ...getSavedData().user[0], tutorial: false }] })
        ).toBe(false);
    });

    test("an install whose only content of its own is in a list that starts with a placeholder holds real data", () => {
        const fresh = getInitialTutorialLists();
        const value = {
            ...fresh,
            user: [{ ...fresh.user[0], tutorial: false }],
            institution: [...fresh.institution, { ...fresh.institution[0], id: 1, name: "My Bank" }],
        };

        expect(holdsRealData(value)).toBe(true);
    });

    test("the demo and the tutorial hold nothing of the user's, however much is in them", () => {
        expect(holdsRealData(getSavedData())).toBe(true);
        expect(holdsRealData(getSavedData({ isDemo: true }))).toBe(false);
        expect(holdsRealData(getSavedData({ tutorial: true }))).toBe(false);
    });

    test("TopHat's own bookkeeping isn't data of the user's", () => {
        const fresh = getInitialTutorialLists();
        const value: ListDataState = {
            ...fresh,
            user: [{ ...fresh.user[0], tutorial: false }],
            notification: [{ id: "demo", contents: "" }],
            patches: [{ id: "1", date: "2026-09-01T10:00:00.000Z" as STime, action: "Tutorial closed", patches: [] }],
        };

        expect(holdsRealData(value)).toBe(false);
    });

    test("describes what a copy holds", () => {
        expect(describeCopy(getSavedData())).toEqual({
            accounts: 1,
            transactions: 1,
            latestTransaction: Coffee.date,
            lastChanged: null,
            isDemo: false,
            holdsRealData: true,
        });
    });
});
