import { TrendingUp } from "@mui/icons-material";
import { isEqual, sum, values } from "lodash";
import { Intents } from "../../../../styles/colours";
import { DataState, ensureNotificationExists, removeNotification, updateUserData } from "../../../data";
import { useFormatValue } from "../../../data/hooks";
import { StubUserID } from "../../../data/types";
import { DefaultDismissNotificationThunk, GreenNotificationText, NotificationContents } from "../shared";
import { MILESTONE_NOTIFICATION_ID, NotificationRuleDefinition } from "../types";

const update = (data: DataState) => {
    const user = data.user.entities[StubUserID]!;

    // Balance milestones
    const balance = sum(
        values(data.account.entities)
            .flatMap((account) => values(account!.balances))
            .map((balance) => balance.localised[0])
    );

    if (balance <= 0) {
        removeNotification(data, MILESTONE_NOTIFICATION_ID);
        updateUserData(data, { milestone: 0 });
        return;
    }

    const milestone = getMilestone(balance);

    if (milestone > user.milestone && milestone >= 10000) {
        ensureNotificationExists(data, MILESTONE_NOTIFICATION_ID, "" + milestone);
        updateUserData(data, { milestone });
    } else if (milestone < user.milestone) {
        removeNotification(data, MILESTONE_NOTIFICATION_ID);
        updateUserData(data, { milestone });
    }
};

export const MilestoneNotificationDefinition: NotificationRuleDefinition = {
    id: MILESTONE_NOTIFICATION_ID,
    display: (alert) => ({
        icon: TrendingUp,
        title: "New Milestone Reached!",
        dismiss: DefaultDismissNotificationThunk(alert.id),
        colour: Intents.success.main,
        children: <NewMilestoneContents value={Number(alert.contents)} />,
    }),
    maybeUpdateState: (previous, current) => {
        if (
            !isEqual(previous?.account, current.account) ||
            !isEqual(previous?.user.entities[StubUserID]!.currency, current.user.entities[StubUserID]!.currency) ||
            !isEqual(previous?.user.entities[StubUserID]!.milestone, current.user.entities[StubUserID]!.milestone)
        )
            update(current);
    },
};

const NewMilestoneContents: React.FC<{ value: number }> = ({ value }) => {
    const format = useFormatValue({ separator: "", end: "k" });
    return (
        <NotificationContents>
            You have a net worth of over <GreenNotificationText>{format(value)}</GreenNotificationText>, and more every
            day. Keep up the good work!
        </NotificationContents>
    );
};

const getMilestone = (balance: number) => {
    const magnitude = Math.pow(10, Math.floor(Math.log10(balance)));
    const leading = Math.floor(balance / magnitude);
    const step = (leading >= 5 ? 0.5 : leading >= 3 ? 0.2 : 0.1) * magnitude;
    return Math.floor(balance / step) * step;
};
