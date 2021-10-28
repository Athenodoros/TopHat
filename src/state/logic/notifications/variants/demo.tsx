import { ListAlt } from "@mui/icons-material";
import { TopHatDispatch } from "../../..";
import { createAndDownloadFile } from "../../../../shared/data";
import { Intents } from "../../../../styles/colours";
import { AppSlice } from "../../../app";
import { Statement } from "../../../data";
import { NotificationContents } from "../shared";
import { DEMO_NOTIFICATION_ID, NotificationRuleDefinition } from "../types";

export const DemoNotificationDefinition: NotificationRuleDefinition = {
    id: DEMO_NOTIFICATION_ID,
    display: ({ contents: file }) => ({
        icon: ListAlt,
        title: "Demo Data",
        colour: Intents.primary.main,
        buttons: [
            { text: "Example Statement", onClick: downloadExampleStatement(JSON.parse(file) as Statement) },
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

const downloadExampleStatement = (statement: Statement) => () =>
    createAndDownloadFile(statement.name, statement.contents);
