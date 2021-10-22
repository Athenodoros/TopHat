import { ListAlt } from "@mui/icons-material";
import { TopHatDispatch, TopHatStore } from "../../..";
import { createAndDownloadFile } from "../../../../shared/data";
import { Intents } from "../../../../styles/colours";
import { AppSlice } from "../../../app";
import { DemoStatementFiles } from "../../../data/demo";
import { StubUserID } from "../../../data/types";
import { NotificationContents, updateNotificationState } from "../shared";
import { NotificationRuleDefinition } from "../types";

export const DEMO_NOTIFICATION_ID = "demo";

const update = () => {
    const { data } = TopHatStore.getState();
    const { isDemo } = data.user.entities[StubUserID]!;

    updateNotificationState({}, DEMO_NOTIFICATION_ID, isDemo ? "" : null);
};

export const DemoNotificationDefinition: NotificationRuleDefinition = {
    id: DEMO_NOTIFICATION_ID,
    updateNotificationState: update,
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
