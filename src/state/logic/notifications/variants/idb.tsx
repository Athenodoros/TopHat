import { FileDownloadOff } from "@mui/icons-material";
import { TopHatDispatch } from "../../..";
import { Intents } from "../../../../styles/colours";
import { AppSlice } from "../../../app";
import { isLocalSync } from "../../storage/store";
import { NotificationContents } from "../shared";
import { DeviceNotificationDefinition, IDB_DEVICE_NOTIFICATION_ID } from "../types";

const goToStorageSettings = () =>
    TopHatDispatch(AppSlice.actions.setDialogPartial({ id: "settings", settings: "storage" }));

export const IDBNotificationDefinition: DeviceNotificationDefinition = {
    id: IDB_DEVICE_NOTIFICATION_ID,
    // The browser's store couldn't be opened, or its last save failed
    isShown: ({ storage, syncs }) => {
        const local = syncs.find(isLocalSync);
        return storage.type === "unavailable" || (local !== undefined && local.status.type !== "IN_STEP");
    },
    display: {
        icon: FileDownloadOff,
        title: "Data Save Failed",
        colour: Intents.danger.main,
        // No dismiss: it shows for as long as nothing can be saved
        buttons: [{ text: "Storage Settings", onClick: goToStorageSettings }],
        children: (
            <NotificationContents>
                TopHat cannot save data in this browser, perhaps because it is running in Private Browsing mode.
                Anything entered will be lost when this page is closed.
            </NotificationContents>
        ),
    },
};
