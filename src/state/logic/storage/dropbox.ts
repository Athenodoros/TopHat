/**
 * Linking a Dropbox account, which is now one more target the data is synced to rather than a
 * backup written alongside it.
 *
 * The OAuth flow runs in a popup rather than by redirecting the app away and back, so there is
 * nothing to read out of the URL on boot. The popup has to come back to a same-origin page that is
 * served without any redirect of its own, which is what `public/dropbox.html` is for.
 *
 * Linking is not simply "add a target". The account may already hold a set of accounts and
 * transactions, and so may the browser, and there is no sensible way to put two of those together:
 * the link is refused, and the user is told that one side or the other has to go first.
 */

import JSZip from "jszip";
import { DefaultTarget, DropboxTarget, ErrorResult, readValueFromTarget, Sync } from "personal-storage-wrapper";
import { TopHatDispatch, TopHatStore } from "../..";
import { BASE_PATHNAME } from "../../app";
import { DataSlice, ListDataState } from "../../data";
import { DataKeys, DropboxSpec, StubUserID } from "../../data/types";
import { DROPBOX_NOTIFICATION_ID } from "../notifications/types";
import { adoptValueFromStorage } from "./index";
import { getStorageManager, holdsRealData, toListDataState } from "./manager";

export const DROPBOX_APP_KEY = "7ru69iyjvo0wz6t";
export const DROPBOX_REDIRECT_URI = `${window.location.origin}${BASE_PATHNAME}/dropbox.html`;

/** Written by the library as gzipped JSON */
export const DROPBOX_PATH = "/data.json.gz";

/** Where versions of TopHat before the migration put their backup: a zip holding one `data.json` */
export const LEGACY_DROPBOX_PATH = "/data.zip";

export const isDropboxSync = (sync: Sync<DefaultTarget>) => sync.target.type === "dropbox";

export type DropboxLinkOutcome =
    /** The account is linked, and syncing from here on */
    | { type: "linked" }
    /** The popup was blocked, closed, or came back without an authorisation code */
    | { type: "cancelled" }
    /** Both the account and this browser hold data the user put in, and only they can choose */
    | { type: "conflict" }
    /** Dropbox refused the account, or gave back something TopHat could not make sense of */
    | { type: "failed"; message: string };

/**
 * The whole link: sign in, look at what the account already holds, and only then decide whether to
 * sync to it. Nothing is written to Dropbox, or to the browser, until that decision is made.
 */
export const linkDropboxAccount = async (): Promise<DropboxLinkOutcome> => {
    const manager = getStorageManager();
    if (!manager) return { type: "failed", message: "TopHat is not ready to sync yet." };

    const target = await DropboxTarget.setupInPopup(DROPBOX_APP_KEY, DROPBOX_REDIRECT_URI, DROPBOX_PATH);
    if (!target) return { type: "cancelled" };

    const remote = await getDataAlreadyInAccount(target);
    if (remote.type === "failed") return remote;

    const local = toListDataState(TopHatStore.getState().data);

    if (remote.value && holdsRealData(remote.value) && holdsRealData(local)) return { type: "conflict" };

    // A backup left by an older version of TopHat, which is not at the path being synced to, so it
    // has to be taken on here rather than left for the library to find
    if (remote.type === "legacy" && remote.value && !holdsRealData(local)) {
        const adopted = await adoptValueFromStorage(remote.value);
        if (!adopted)
            return {
                type: "failed",
                message: "The backup in this Dropbox account was written by a newer version of TopHat.",
            };
    }

    await manager.addTarget(target);
    return { type: "linked" };
};

type RemoteData = { type: "current" | "legacy"; value: ListDataState | null } | { type: "failed"; message: string };

/**
 * What the account already holds, looking at the backup written by older versions of TopHat if the
 * file this one syncs to is not there yet.
 */
const getDataAlreadyInAccount = async (target: DropboxTarget): Promise<RemoteData> => {
    const current = await readValueFromTarget<ListDataState, DropboxTarget>(target, true);

    if (current.type === "error") return { type: "failed", message: describeDropboxError(current) };
    if (current.value) return { type: "current", value: current.value.value };

    return getLegacyDataInAccount(target);
};

/**
 * The `data.zip` older versions wrote: a zip holding `data.json`, which is the normalised store
 * rather than the lists that are synced now, so it is converted on the way through.
 */
const getLegacyDataInAccount = async (target: DropboxTarget): Promise<RemoteData> => {
    const legacy = DropboxTarget.deserialise({ ...target.serialise(), path: LEGACY_DROPBOX_PATH });
    const contents = await legacy.read();

    if (contents.type === "error") {
        // An account with no backup at all is the ordinary case, not a failure
        if (contents.error === "MISSING_FILE") return { type: "current", value: null };
        return { type: "failed", message: describeDropboxError(contents) };
    }
    if (contents.value === null) return { type: "current", value: null };

    try {
        const zip = await JSZip.loadAsync(contents.value.buffer);
        const file = zip.file("data.json");
        if (!file) return { type: "current", value: null };

        return { type: "legacy", value: getListsFromStoredState(JSON.parse(await file.async("string"))) };
    } catch (thrown) {
        return {
            type: "failed",
            message: withCause("The backup in this Dropbox account could not be read.", getThrownMessage(thrown)),
        };
    }
};

/**
 * `data.zip` holds the store as the entity adapters keep it - `{ ids, entities }` per table - and
 * everything since works in the lists those flatten to.
 */
const getListsFromStoredState = (stored: Record<string, { ids?: unknown[]; entities?: Record<string, unknown> }>) =>
    Object.fromEntries(
        DataKeys.map((key) => {
            const table = stored[key];
            if (!table?.ids || !table?.entities) return [key, []];

            return [key, table.ids.map((id) => table.entities![id as string]).filter((entity) => entity !== undefined)];
        })
    ) as unknown as ListDataState;

/**
 * What to put in front of the user, with whatever the library managed to find out about the failure
 * after it. The plain sentence on its own is often not enough to act on - "TopHat may not have
 * permission" and `missing_scope/files.content.read` are a long way apart in usefulness.
 */
const describeDropboxError = ({ error, detail }: ErrorResult) =>
    withCause(
        error === "INVALID_AUTH"
            ? "Dropbox refused the account. TopHat may not have permission to read and write its files."
            : error === "OFFLINE"
            ? "TopHat could not reach Dropbox."
            : "TopHat could not read the data in this Dropbox account.",
        detail
    );

const withCause = (message: string, cause: string | undefined) => (cause ? `${message} (${cause})` : message);

const getThrownMessage = (thrown: unknown) =>
    thrown instanceof Error ? thrown.message || String(thrown) : thrown ? String(thrown) : undefined;

export const unlinkDropbox = async () => {
    const manager = getStorageManager();
    if (!manager) return;

    await Promise.all(
        manager
            .getSyncsState()
            .filter(isDropboxSync)
            .map((sync) => manager.removeSync(sync))
    );
    TopHatDispatch(DataSlice.actions.updateNotificationState({ id: DROPBOX_NOTIFICATION_ID, contents: null }));
};

/**
 * A refresh token saved by the version of TopHat that did its own Dropbox uploads, turned into a
 * sync target. The token was kept inside the synced data itself, so it is also cleared out of there.
 *
 * Being offline is not a reason to give up on it - the token is left where it is and the next boot
 * tries again. A token the API rejects is cleared, and the user is told to link the account again.
 */
export const migrateLegacyDropboxToken = async () => {
    const manager = getStorageManager();
    if (!manager) return;

    const spec = TopHatStore.getState().data.user.entities[StubUserID]?.dropbox;

    // "loading" is left behind by a redirect that never finished, and is not a token
    if (!spec || typeof spec !== "object") return;
    if (manager.getSyncsState().some(isDropboxSync)) return;

    const target = getTargetForToken(spec, { id: "", email: spec.email, name: spec.name });
    const user = await target.fetchJSON<DropboxAccount>("https://api.dropboxapi.com/2/users/get_current_account", {
        method: "POST",
    });

    if (user.type === "error") {
        // Offline or a request that simply failed, so try again on the next boot
        if (user.error !== "INVALID_AUTH") return;

        TopHatDispatch(DataSlice.actions.updateUserPartial({ dropbox: undefined }));
        TopHatDispatch(DataSlice.actions.updateNotificationState({ id: DROPBOX_NOTIFICATION_ID, contents: "" }));
        return;
    }

    await manager.addTarget(
        getTargetForToken(spec, {
            id: user.value.account_id,
            email: user.value.email,
            name: user.value.name.display_name,
        })
    );
    TopHatDispatch(DataSlice.actions.updateUserPartial({ dropbox: undefined }));
};

interface DropboxAccount {
    account_id: string;
    email: string;
    name: { display_name: string };
}

/** An expiry in the past, so that the first request exchanges the refresh token for a live one */
const getTargetForToken = (spec: DropboxSpec, user: { id: string; email: string; name: string }) =>
    DropboxTarget.deserialise({
        connection: {
            clientId: DROPBOX_APP_KEY,
            refreshToken: spec.refreshToken,
            accessToken: "",
            expiry: new Date(0).toISOString(),
        },
        user,
        path: DROPBOX_PATH,
    });
