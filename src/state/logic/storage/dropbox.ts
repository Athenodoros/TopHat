/**
 * Linking a Dropbox account, which is a second target the data is synced to, rather than a backup
 * written alongside it as earlier versions of TopHat had.
 *
 * Signing in runs in a popup rather than by sending the app away and back, so nothing waits on what
 * boot is doing - including a choice between copies of the data, which would hold up the redirect's
 * code until it expired. The popup comes back to `public/dropbox.html`, a static page that is never
 * the app.
 *
 * Linking is not simply "add a target". The account may hold TopHat data already, and so may the
 * browser, and two sets of a person's accounts and transactions can't sensibly be put together. So
 * the account is read first, and only then is it decided which copy to keep: the account's, if the
 * browser holds nothing but the tutorial or the demo; the browser's, if the account holds nothing of
 * the user's; and neither, if both do - the link is refused, and nothing changes on either side.
 */

import { DropboxTarget, ErrorResult, readValueFromTarget } from "personal-storage-wrapper";
import { TopHatDispatch, TopHatStore } from "../..";
import { BASE_PATHNAME } from "../../app";
import { DataSlice, ListDataState, toListDataState } from "../../data";
import { DropboxSpec, StubUserID } from "../../data/types";
import { DROPBOX_RELINK_CONTENTS, DROPBOX_RETRY_CONTENTS } from "../notifications/variants/dropbox";
import { DROPBOX_NOTIFICATION_ID } from "../notifications/types";
import { holdsRealData, isSameData } from "./conflicts";
import {
    addRemoteTarget,
    adoptRemoteValue,
    getProblemWithValue,
    getRemoteLinkProblem,
    hasRemoteTarget,
    removeRemoteTargets,
} from "./index";
import { getTargetForLegacyToken, readLegacyDropboxBackup } from "./legacy/dropbox";

export const DROPBOX_APP_KEY = "7ru69iyjvo0wz6t";
export const DROPBOX_REDIRECT_URI = `${window.location.origin}${BASE_PATHNAME}/dropbox.html`;

/** Where the data is synced to, gzipped JSON of the lists the browser's store holds */
export const DROPBOX_PATH = "/data.json.gz";

const DROPBOX_TARGET_TYPE = "dropbox";

export type DropboxLinkOutcome =
    /** The account is linked, and holds the same data as the browser: the browser's, or the account's, which it took */
    | { type: "linked"; kept: "browser" | "dropbox" }
    /** The popup was blocked or closed, or the user turned TopHat down */
    | { type: "cancelled" }
    /** Both the account and the browser hold data of the user's own, so nothing was linked */
    | { type: "refused" }
    /** Something went wrong, as `message` says, and nothing was linked */
    | { type: "failed"; message: string };

/**
 * The whole link: sign in, look at what the account holds, decide which copy to keep, and only then
 * start syncing. Nothing is written to Dropbox or the browser until that decision is made.
 */
export const linkDropboxAccount = async (): Promise<DropboxLinkOutcome> => {
    const problem = getLinkProblem();
    if (problem) return { type: "failed", message: problem };

    const signedIn = await DropboxTarget.setupInPopup(DROPBOX_APP_KEY, DROPBOX_REDIRECT_URI, DROPBOX_PATH);
    if (signedIn.type === "error")
        return {
            type: "failed",
            message: describeDropboxError("TopHat could not sign in to Dropbox.", signedIn, SIGN_IN_REFUSED),
        };
    if (signedIn.value === null) return { type: "cancelled" };

    // The user may have taken a while over it
    const later = getLinkProblem();
    if (later) return { type: "failed", message: later };

    return connect(signedIn.value, "link");
};

/** Stops syncing to Dropbox. What is in the account, and in the browser, is left as it is. */
export const unlinkDropbox = () => removeRemoteTargets(DROPBOX_TARGET_TYPE);

const getLinkProblem = () =>
    getRemoteLinkProblem() ??
    (hasRemoteTarget(DROPBOX_TARGET_TYPE) ? "A Dropbox account is linked already. Remove it to link another." : null);

/**
 * Deciding which copy to keep
 */

type AccountContents =
    | { type: "value"; value: ListDataState | null; legacy: boolean }
    | { type: "failed"; message: string };

/**
 * What the account holds: the file this version syncs to, or else the backup an earlier version left.
 * That backup is only read when the file is missing - a stale one never wins over the synced file - and
 * is left where it is either way.
 */
const readAccount = async (target: DropboxTarget): Promise<AccountContents> => {
    const current = await readValueFromTarget<ListDataState, DropboxTarget>(target, true, getProblemWithValue);
    if (current.type === "error")
        return {
            type: "failed",
            message: describeDropboxError(
                current.error === "CORRUPT_VALUE"
                    ? "The TopHat data in this Dropbox account can't be used."
                    : "TopHat could not read the data in this Dropbox account.",
                current
            ),
        };
    if (current.value) return { type: "value", value: current.value.value, legacy: false };

    const legacy = await readLegacyDropboxBackup(target);
    if (legacy.type === "error")
        return {
            type: "failed",
            message: legacy.error
                ? describeDropboxError("TopHat could not read the data in this Dropbox account.", legacy.error)
                : legacy.message,
        };

    // Checked as any stored value is, for what the backup's own checks don't cover
    const problem = legacy.value && getProblemWithValue(legacy.value);
    if (problem)
        return {
            type: "failed",
            message: "The backup an earlier version of TopHat left in this Dropbox account can't be used: " + problem,
        };

    return { type: "value", value: legacy.value, legacy: true };
};

/**
 * Reads the account, decides which copy to keep, and starts syncing. A link the user asked for is
 * refused where both copies hold data of the user's own. Moving an earlier version's link over is not
 * something the user asked for at that moment, so there the account's file goes to the usual chooser
 * instead, and the old backup loses to the browser - which made it, and is left with it as it was.
 */
const connect = async (target: DropboxTarget, reason: "link" | "move"): Promise<DropboxLinkOutcome> => {
    const account = await readAccount(target);
    if (account.type === "failed") return account;

    const remote = account.value;
    const browser = toListDataState(TopHatStore.getState().data);

    // Read while the account was, so anything that has come up since stops it here
    const problem = getRemoteLinkProblem();
    if (problem) return { type: "failed", message: problem };

    // The browser's copy is kept, and replaces whatever was in the synced file
    const superseding = account.legacy ? null : remote;

    if (remote === null || isSameData(remote, browser)) {
        await addRemoteTarget(target, superseding);
    } else if (!holdsRealData(browser)) {
        await adoptRemoteValue(remote);
        await addRemoteTarget(target, superseding);
        finishLink();
        return { type: "linked", kept: "dropbox" };
    } else if (!holdsRealData(remote) || (reason === "move" && account.legacy)) {
        await addRemoteTarget(target, superseding);
    } else if (reason === "move") {
        // Neither replaces the other: the target is added knowing nothing of either, so the user chooses
        await addRemoteTarget(target, null);
    } else return { type: "refused" };

    finishLink();
    return { type: "linked", kept: "browser" };
};

/** An earlier version's link has no more use once an account is linked, wherever it came from */
const finishLink = () => TopHatDispatch(DataSlice.actions.clearLegacyDropboxLink());

/**
 * The link an earlier version made
 */

/**
 * Moves the link an earlier version of TopHat made - a refresh token in the user's settings - over to
 * a linked account, once. Offline, or any other failure that may pass, it is left to try again on a
 * later boot; until then nothing is backed up, which the notification says. A token Dropbox no longer
 * accepts is removed, and the user is asked to link the account again.
 *
 * Nothing here is allowed to escape, since it runs once the app is already on screen.
 */
export const moveLegacyDropboxLink = async () => {
    try {
        await tryToMoveLegacyDropboxLink();
    } catch (error) {
        console.error("TopHat could not move the Dropbox link an earlier version made", error);
        showLegacyLinkProblem(DROPBOX_RETRY_CONTENTS);
    }
};

const tryToMoveLegacyDropboxLink = async () => {
    const spec = TopHatStore.getState().data.user.entities[StubUserID]?.dropbox;
    if (spec === undefined) return;

    // "loading" is left by a redirect back from Dropbox that never finished, and holds no token. An
    // account linked since makes the earlier link redundant, whoever's data it came in with.
    if (spec === "loading" || hasRemoteTarget(DROPBOX_TARGET_TYPE)) return finishLink();

    // Frozen for recovery, or waiting on the user: neither is a reason to give up on the link
    if (getRemoteLinkProblem()) return;

    const target = await getTargetForAccount(spec);
    if (target.type === "error") {
        if (target.error === "INVALID_AUTH") {
            finishLink();
            showLegacyLinkProblem(DROPBOX_RELINK_CONTENTS);
        } else showLegacyLinkProblem(DROPBOX_RETRY_CONTENTS);
        return;
    }

    const outcome = await connect(target.value, "move");
    if (outcome.type !== "linked") {
        console.error("TopHat could not move the Dropbox link an earlier version made", outcome);
        showLegacyLinkProblem(DROPBOX_RETRY_CONTENTS);
    }
};

/** The token's account, asked of Dropbox, which also says whether the token still works */
const getTargetForAccount = async (spec: DropboxSpec) => {
    const target = getTargetForLegacyToken(spec, DROPBOX_APP_KEY, DROPBOX_PATH);
    const account = await target.fetchJSON<{ account_id: string; email: string; name: { display_name: string } }>(
        "https://api.dropboxapi.com/2/users/get_current_account",
        { method: "POST" }
    );
    if (account.type === "error") return account;

    // The connection now holds the access token the request was made with
    const { connection, path } = target.serialise();
    const user = { id: account.value.account_id, email: account.value.email, name: account.value.name.display_name };
    return { type: "value", value: DropboxTarget.deserialise({ connection, user, path }) } as const;
};

const showLegacyLinkProblem = (contents: string) =>
    TopHatDispatch(DataSlice.actions.updateNotificationState({ id: DROPBOX_NOTIFICATION_ID, contents }));

/** Dropbox turned down the sign-in itself: an expired or used code, say, which a fresh attempt gets past */
const SIGN_IN_REFUSED = "Dropbox didn't accept the sign-in. Try linking the account again.";
/** Dropbox turned down a request with an account that signed in: usually a permission the app doesn't have */
const ACCOUNT_REFUSED = "Dropbox refused the account: TopHat may not have permission to read and write its files.";

/**
 * What to tell the user, with whatever Dropbox said after it. The sentence alone is often not enough
 * to act on: "TopHat may not have permission" and `missing_scope/..` are a long way apart.
 */
const describeDropboxError = (lead: string, { error, detail }: ErrorResult, refused: string = ACCOUNT_REFUSED) => {
    const message =
        error === "INVALID_AUTH"
            ? lead + " " + refused
            : error === "OFFLINE"
            ? lead + " TopHat could not reach Dropbox."
            : lead;
    return detail ? `${message} (${detail})` : message;
};
