import { FileDownloadOff } from "@mui/icons-material";
import { TopHatDispatch } from "../../..";
import { Intents } from "../../../../styles/colours";
import { AppSlice } from "../../../app";
import { ensureNotificationExists, removeNotification } from "../../../data";
import { NotificationContents } from "../shared";
import { IDB_NOTIFICATION_ID, NotificationRuleDefinition } from "../types";

let iDBConnectionExists = false;
let remoteHoldsLatestCopy = false;

/** Whether the browser's store is saving. Returns whether that changed, so that the caller can update the warning. */
export const setIDBConnectionExists = (value: boolean) => {
    const changed = value !== iDBConnectionExists;
    iDBConnectionExists = value;
    return changed;
};

/** Whether a remote target holds the latest value. Returns whether that changed. */
export const setRemoteHoldsLatestCopy = (value: boolean) => {
    const changed = value !== remoteHoldsLatestCopy;
    remoteHoldsLatestCopy = value;
    return changed;
};

/**
 * The browser can't save, but Dropbox is still being synced. It is a warning rather than an error,
 * since nothing is being lost yet, but it is still the only copy.
 */
const REMOTE_ONLY_CONTENTS = "remote-only";

export const IDBNotificationDefinition: NotificationRuleDefinition = {
    id: IDB_NOTIFICATION_ID,
    display: ({ contents }) =>
        contents === REMOTE_ONLY_CONTENTS
            ? {
                  icon: FileDownloadOff,
                  title: "Only Saved to Dropbox",
                  colour: Intents.warning.main,
                  // No dismiss: the rule puts this back on every change for as long as nothing can be saved here
                  buttons: [{ text: "Storage Settings", onClick: goToStorageSettings }],
                  children: (
                      <NotificationContents>
                          TopHat cannot save data in this browser, perhaps because it is running in Private Browsing
                          mode. It is still syncing to Dropbox, which now holds the only copy of anything entered here.
                      </NotificationContents>
                  ),
              }
            : {
                  icon: FileDownloadOff,
                  title: "Data Save Failed",
                  colour: Intents.danger.main,
                  // No dismiss: the rule puts this back on every change for as long as nothing can be saved
                  buttons: [{ text: "Storage Settings", onClick: goToStorageSettings }],
                  children: (
                      <NotificationContents>
                          TopHat cannot save data in this browser, perhaps because it is running in Private Browsing
                          mode. Anything entered will be lost when this page is closed.
                      </NotificationContents>
                  ),
              },
    maybeUpdateState: (_, current) => {
        if (iDBConnectionExists) removeNotification(current, IDB_NOTIFICATION_ID);
        else ensureNotificationExists(current, IDB_NOTIFICATION_ID, remoteHoldsLatestCopy ? REMOTE_ONLY_CONTENTS : "");
    },
};

const goToStorageSettings = () =>
    TopHatDispatch(AppSlice.actions.setDialogPartial({ id: "settings", settings: "storage" }));
