import { TrendingUp } from "@mui/icons-material";
import { sum, values } from "lodash";
import { TopHatStore } from "../../..";
import { Intents } from "../../../../styles/colours";
import { useFormatValue } from "../../../data/hooks";
import { StubUserID } from "../../../data/types";
import {
    DefaultDismissNotificationThunk,
    GreenNotificationText,
    NotificationContents,
    updateNotificationState,
} from "../shared";
import { NotificationRuleDefinition } from "../types";

export const MILESTONE_NOTIFICATION_ID = "new-milestone";

const update = () => {
    const { data } = TopHatStore.getState();
    const user = data.user.entities[StubUserID]!;

    // Balance milestones
    const balance = sum(
        values(data.account.entities)
            .flatMap((account) => values(account!.balances))
            .map((balance) => balance.localised[0])
    );

    if (balance <= 0) {
        updateNotificationState({ milestone: 0 }, MILESTONE_NOTIFICATION_ID, null);
        return;
    }

    let milestone = Math.pow(10, Math.floor(Math.log10(balance)));
    if (balance >= milestone * 5) milestone *= 5;
    else if (balance >= milestone * 2) milestone *= 2;

    if (milestone > user.milestone && milestone >= 10000)
        updateNotificationState({ milestone }, MILESTONE_NOTIFICATION_ID, "" + milestone);
    else if (milestone < user.milestone) updateNotificationState({ milestone }, MILESTONE_NOTIFICATION_ID, null);
};

export const MilestoneNotificationDefinition: NotificationRuleDefinition = {
    id: MILESTONE_NOTIFICATION_ID,
    updateNotificationState: update,
    display: (alert) => ({
        icon: TrendingUp,
        title: "New Milestone Reached!",
        dismiss: DefaultDismissNotificationThunk(alert.id),
        colour: Intents.success.main,
        children: <NewMilestoneContents value={Number(alert.contents)} />,
    }),
};

const NewMilestoneContents: React.FC<{ value: number }> = ({ value }) => {
    const format = useFormatValue("0a");
    return (
        <NotificationContents>
            You have a net worth of over <GreenNotificationText>{format(value)}</GreenNotificationText>, and more every
            day. Keep up the good work!
        </NotificationContents>
    );
};
