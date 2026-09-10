import { CloudOff } from "@mui/icons-material";
import { TopHatDispatch } from "../../..";
import { Intents } from "../../../../styles/colours";
import { AppSlice } from "../../../app";
import { DataSlice } from "../../../data";
import { NotificationContents } from "../shared";
import { DROPBOX_NOTIFICATION_ID, NotificationRuleDefinition } from "../types";

export const DropboxNotificationDefinition: NotificationRuleDefinition = {
    id: DROPBOX_NOTIFICATION_ID,
    display: () => ({
        icon: CloudOff,
        title: "Dropbox Sync Failed",
        colour: Intents.danger.main,
        buttons: [{ text: "Manage Config", onClick: goToSyncConfig }],
        children: (
            <NotificationContents>
                TopHat has stopped syncing data to Dropbox, and nothing is being backed up. Open the sync settings to
                remove the link and create it again.
            </NotificationContents>
        ),
    }),
};

const goToSyncConfig = () => TopHatDispatch(AppSlice.actions.setDialogPartial({ id: "settings", settings: "storage" }));

/**
 * A Dropbox sync fails in two ways, and only one of them is an error.
 *
 * An upload can fail, which is logged. A sync can also be marked as desynced, after which the
 * library stops writing to it: no upload is attempted, so no upload fails, and without this the app
 * would go on looking as though everything were backed up while nothing was being written at all.
 */
export type DropboxSyncState = "none" | "working" | "failed";

export const setDropboxSyncState = (state: DropboxSyncState) => {
    if (state === dropboxSyncState) return;
    dropboxSyncState = state;

    TopHatDispatch(
        DataSlice.actions.updateNotificationState({
            id: DROPBOX_NOTIFICATION_ID,
            contents: state === "failed" ? "" : null,
        })
    );
};

export const getDropboxSyncState = () => dropboxSyncState;

let dropboxSyncState: DropboxSyncState = "none";
