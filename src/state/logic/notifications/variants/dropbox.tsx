import { CloudOff } from "@mui/icons-material";
import { TopHatDispatch } from "../../..";
import { Intents } from "../../../../styles/colours";
import { AppSlice } from "../../../app";
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
                Data syncs with Dropbox are failing - you may need to remove the link to Dropbox and re-create it.
            </NotificationContents>
        ),
    }),
};

const goToSyncConfig = () => TopHatDispatch(AppSlice.actions.setDialogPartial({ id: "settings", settings: "storage" }));
