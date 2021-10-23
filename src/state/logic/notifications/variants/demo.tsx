import { ListAlt } from "@mui/icons-material";
import { TopHatDispatch } from "../../..";
import { createAndDownloadFile } from "../../../../shared/data";
import { Intents } from "../../../../styles/colours";
import { AppSlice } from "../../../app";
import { DataState, ensureNotificationExists, removeNotification } from "../../../data";
import { DemoStatementFiles } from "../../../data/demo";
import { StubUserID } from "../../../data/types";
import { NotificationContents } from "../shared";
import { NotificationRuleDefinition } from "../types";

export const DEMO_NOTIFICATION_ID = "demo";

const update = (data: DataState) => {
    const { isDemo } = data.user.entities[StubUserID]!;

    if (isDemo) ensureNotificationExists(data, DEMO_NOTIFICATION_ID, "");
    else removeNotification(data, DEMO_NOTIFICATION_ID);
};

export const DemoNotificationDefinition: NotificationRuleDefinition = {
    id: DEMO_NOTIFICATION_ID,
    display: () => ({
        icon: ListAlt,
        title: "Demo Data",
        colour: Intents.primary.main,
        buttons: [
            { text: "Example Statement", onClick: downloadExampleStatement },
            { text: "Manage Data", onClick: manageData },
        ],
        children: (
            <NotificationContents>
                TopHat is showing example data. Once you're ready, reset everything to use your own.
            </NotificationContents>
        ),
    }),
    maybeUpdateState: (previous, current) => {
        if (previous?.user.entities[StubUserID]!.isDemo !== current.user.entities[StubUserID]!.isDemo) update(current);
    },
};

const manageData = () => {
    TopHatDispatch(
        AppSlice.actions.setDialogPartial({
            id: "settings",
            settings: "import",
        })
    );
};

const downloadExampleStatement = () =>
    createAndDownloadFile(DemoStatementFiles[0].name, DemoStatementFiles[0].contents);
