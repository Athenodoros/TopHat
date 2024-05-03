import { FileDownloadOff } from "@mui/icons-material";
import { Intents } from "../../../../styles/colours";
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
        children: (
            <NotificationContents>
                TopHat has not been able to connect to the data store, perhaps because it is running in Private Browsing
                mode. Data will not be saved.
            </NotificationContents>
        ),
    }),
    maybeUpdateState: (_, current) => {
        if (iDBConnectionExists) removeNotification(current, IDB_NOTIFICATION_ID);
        else ensureNotificationExists(current, IDB_NOTIFICATION_ID, "");
    },
};
