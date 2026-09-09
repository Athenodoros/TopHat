/**
 * Linking a Dropbox account, which is now one more target the data is synced to rather than a
 * backup written alongside it.
 *
 * The OAuth flow runs in a popup rather than by redirecting the app away and back, so there is
 * nothing to read out of the URL on boot. The popup has to come back to a same-origin page that is
 * served without any redirect of its own, which is what `public/dropbox.html` is for.
 */

import { DefaultTarget, DropboxTarget, Sync } from "personal-storage-wrapper";
import { TopHatDispatch, TopHatStore } from "../..";
import { BASE_PATHNAME } from "../../app";
import { DataSlice } from "../../data";
import { DropboxSpec, StubUserID } from "../../data/types";
import { DROPBOX_NOTIFICATION_ID } from "../notifications/types";
import { getStorageManager } from "./manager";

export const DROPBOX_APP_KEY = "7ru69iyjvo0wz6t";
export const DROPBOX_REDIRECT_URI = `${window.location.origin}${BASE_PATHNAME}/dropbox.html`;

/** Written by the library as gzipped JSON. The `/data.zip` the old version wrote is left alone. */
export const DROPBOX_PATH = "/data.json.gz";

export const isDropboxSync = (sync: Sync<DefaultTarget>) => sync.target.type === "dropbox";

/** False when the popup was blocked, closed, or came back without an authorisation code */
export const linkDropboxInPopup = async (): Promise<boolean> => {
    const manager = getStorageManager();
    if (!manager) return false;

    const target = await DropboxTarget.setupInPopup(DROPBOX_APP_KEY, DROPBOX_REDIRECT_URI, DROPBOX_PATH);
    if (!target) return false;

    await manager.addTarget(target);
    return true;
};

export const unlinkDropbox = async () => {
    const manager = getStorageManager();
    if (!manager) return;

    await Promise.all(manager.getSyncsState().filter(isDropboxSync).map((sync) => manager.removeSync(sync)));
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
        getTargetForToken(spec, { id: user.value.account_id, email: user.value.email, name: user.value.name.display_name })
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
