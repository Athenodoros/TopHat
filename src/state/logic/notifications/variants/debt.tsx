import { TrendingDown } from "@mui/icons-material";
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

export const DEBT_NOTIFICATION_ID = "debt-level";

const update = () => {
    const { data } = TopHatStore.getState();
    const user = data.user.entities[StubUserID]!;

    // Balance milestones
    const debt = -sum(
        values(data.account.entities)
            .flatMap((account) => values(account!.balances))
            .map((balance) => balance.localised[0])
            .filter((value) => value < 0)
    );

    // If there is no debt and previous milestone existed, send notification
    if (debt <= 0) {
        if (user.milestone < 0) updateNotificationState({ milestone: 0 }, DEBT_NOTIFICATION_ID, "0");
        else updateNotificationState({ milestone: 0 }, DEBT_NOTIFICATION_ID, null);
        return;
    }

    let milestone = Math.pow(10, Math.ceil(Math.log10(debt)));
    if (debt <= milestone / 5) milestone /= 5;
    else if (debt <= milestone / 2) milestone /= 2;

    // If debt has shrunk, send alert
    if (milestone < user.milestone && milestone >= 1000) {
        updateNotificationState({ milestone }, DEBT_NOTIFICATION_ID, "" + milestone);
        return;
    }

    // If debt has increased, remove alert and update milestone
    if (milestone > user.milestone) {
        // updateNotificationState({ milestone }, DEBT_NOTIFICATION_ID, null);
        return;
    }
};

export const DebtNotificationDefinition: NotificationRuleDefinition = {
    id: DEBT_NOTIFICATION_ID,
    updateNotificationState: update,
    display: (alert) => ({
        icon: TrendingDown,
        title: alert.contents === "0" ? "Debt Fully Paid!" : "Debt Shrinking!",
        dismiss: DefaultDismissNotificationThunk(alert.id),
        colour: Intents.success.main,
        children: <DebtMilestoneContents value={Number(alert.contents)} />,
    }),
};

const DebtMilestoneContents: React.FC<{ value: number }> = ({ value }) => {
    const format = useFormatValue("0a");
    return value === 0 ? (
        <NotificationContents>
            You have paid down all of your debts, across every account. Congratulations!
        </NotificationContents>
    ) : (
        <NotificationContents>
            You have paid down your debts to under <GreenNotificationText>{format(value)}</GreenNotificationText>. Keep
            up the good work!
        </NotificationContents>
    );
};
