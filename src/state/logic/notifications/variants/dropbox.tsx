import { CloudOff } from "@mui/icons-material";
import { TopHatDispatch } from "../../..";
import { Intents } from "../../../../styles/colours";
import { AppSlice } from "../../../app";
import { ensureNotificationExists, removeNotification } from "../../../data";
import { StubUserID } from "../../../data/types";
import { DefaultDismissNotificationThunk, NotificationContents } from "../shared";
import { DROPBOX_NOTIFICATION_ID, NotificationRuleDefinition } from "../types";

/**
 * How the linked Dropbox account stands. Being offline isn't failing: the account catches up with
 * the first save once the browser is back online, as the old backup did.
 */
export type DropboxSyncStatus = "unlinked" | "working" | "failing";

let status: DropboxSyncStatus = "unlinked";

/** Returns whether that changed, so that the caller can update the notification */
export const setDropboxSyncStatus = (value: DropboxSyncStatus) => {
    const changed = value !== status;
    status = value;
    return changed;
};

/**
 * The notification's contents say what is wrong. Empty is a linked account that is failing, which
 * clears itself once the account works again, and is what the old backup saved when it failed. The
 * other two are about the link an earlier version of TopHat made, which this one moves over to a
 * linked account on boot, and stay until the user deals with them or the move works.
 */
/** The earlier version's link can no longer sign in to Dropbox, and has been removed */
export const DROPBOX_RELINK_CONTENTS = "relink";
/** The earlier version's link couldn't be moved over this time, and will be tried again */
export const DROPBOX_RETRY_CONTENTS = "retry";

export const DropboxNotificationDefinition: NotificationRuleDefinition = {
    id: DROPBOX_NOTIFICATION_ID,
    display: ({ contents }) => ({
        icon: CloudOff,
        title: contents === DROPBOX_RELINK_CONTENTS ? "Dropbox Link Expired" : "Dropbox Sync Failed",
        colour: Intents.danger.main,
        buttons: [{ text: "Manage Config", onClick: goToSyncConfig }],
        dismiss: contents === "" ? undefined : DefaultDismissNotificationThunk(DROPBOX_NOTIFICATION_ID),
        children: (
            <NotificationContents>
                {contents === DROPBOX_RELINK_CONTENTS
                    ? "Dropbox no longer accepts the link an earlier version of TopHat made, so nothing is being backed up. Link the account again to keep syncing."
                    : contents === DROPBOX_RETRY_CONTENTS
                    ? "TopHat could not move the Dropbox link an earlier version made over to this one, so nothing is being backed up yet. It will try again the next time TopHat starts."
                    : "TopHat could not save the latest changes to Dropbox, and will try again with the next change. If this keeps happening, remove the link and create it again."}
            </NotificationContents>
        ),
    }),
    maybeUpdateState: (_, current) => {
        if (status === "failing") {
            ensureNotificationExists(current, DROPBOX_NOTIFICATION_ID, "");
            return;
        }
        if (status === "working") {
            removeNotification(current, DROPBOX_NOTIFICATION_ID);
            return;
        }

        // With no account linked, only the earlier version's link is worth saying anything about: one that
        // has yet to be moved over keeps whatever was said about it, and one that has expired says so until dismissed
        const contents = current.notification.entities[DROPBOX_NOTIFICATION_ID]?.contents;
        const legacyLink = typeof current.user.entities[StubUserID]?.dropbox === "object";
        if (contents === undefined || contents === DROPBOX_RELINK_CONTENTS || legacyLink) return;
        removeNotification(current, DROPBOX_NOTIFICATION_ID);
    },
};

const goToSyncConfig = () => TopHatDispatch(AppSlice.actions.setDialogPartial({ id: "settings", settings: "storage" }));
