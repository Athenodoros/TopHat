import { CloudOff } from "@mui/icons-material";
import { noop } from "lodash";
import { TopHatDispatch } from "../../..";
import { Intents } from "../../../../styles/colours";
import { AppSlice } from "../../../app";
import { NotificationContents } from "../shared";
import { NotificationRuleDefinition } from "../types";

export const CURRENCY_NOTIFICATION_ID = "currency-sync-broken";

export const CurrencyNotificationDefinition: NotificationRuleDefinition = {
    id: CURRENCY_NOTIFICATION_ID,
    updateNotificationState: noop,
    display: () => ({
        icon: CloudOff,
        title: "Currency Sync Failed",
        colour: Intents.danger.main,
        buttons: [{ text: "Manage Config", onClick: goToSyncConfig }],
        children: (
            <NotificationContents>
                Currency syncs with AlphaVantage are failing - you may need to change the token you're using to pull the
                data.
            </NotificationContents>
        ),
    }),
};

const goToSyncConfig = () =>
    TopHatDispatch(AppSlice.actions.setDialogPartial({ id: "settings", settings: "currency" }));
