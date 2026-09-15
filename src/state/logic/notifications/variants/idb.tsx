import { FileDownloadOff } from "@mui/icons-material";
import { TopHatDispatch } from "../../..";
import { Intents } from "../../../../styles/colours";
import { AppSlice } from "../../../app";
import { ensureNotificationExists, removeNotification } from "../../../data";
import { NotificationContents } from "../shared";
import { IDB_NOTIFICATION_ID, NotificationRuleDefinition } from "../types";

let iDBConnectionExists = false;
export const setIDBConnectionExists = (value: boolean) => (iDBConnectionExists = value);

export const IDBNotificationDefinition: NotificationRuleDefinition = {
    id: IDB_NOTIFICATION_ID,
    display: () => ({
        icon: FileDownloadOff,
        title: "Data Save Failed",
        colour: Intents.danger.main,
        // No dismiss: the rule puts this back on every change for as long as nothing can be saved
        buttons: [{ text: "Storage Settings", onClick: goToStorageSettings }],
        children: (
            <NotificationContents>
                TopHat cannot save data in this browser, perhaps because it is running in Private Browsing mode.
                Anything entered will be lost when this page is closed.
            </NotificationContents>
        ),
    }),
    maybeUpdateState: (_, current) => {
        if (iDBConnectionExists) removeNotification(current, IDB_NOTIFICATION_ID);
        else ensureNotificationExists(current, IDB_NOTIFICATION_ID, "");
    },
};

const goToStorageSettings = () =>
    TopHatDispatch(AppSlice.actions.setDialogPartial({ id: "settings", settings: "storage" }));
