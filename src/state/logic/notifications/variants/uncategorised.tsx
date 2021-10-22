import { Payment } from "@mui/icons-material";
import { TopHatDispatch, TopHatStore } from "../../..";
import { Intents } from "../../../../styles/colours";
import { AppSlice, DefaultPages } from "../../../app";
import { PLACEHOLDER_CATEGORY_ID } from "../../../data";
import { StubUserID } from "../../../data/types";
import {
    DefaultDismissNotificationThunk,
    NotificationContents,
    OrangeNotificationText,
    updateNotificationState,
} from "../shared";
import { NotificationRuleDefinition } from "../types";

export const UNCATEGORISED_NOTIFICATION_ID = "uncategorised-transactions";

const update = () => {
    const { data } = TopHatStore.getState();
    const { uncategorisedTransactionsAlerted } = data.user.entities[StubUserID]!;

    const uncategorised = data.category.entities[PLACEHOLDER_CATEGORY_ID]!.transactions.count;
    const notification = data.notification.entities[UNCATEGORISED_NOTIFICATION_ID];

    if (uncategorised === 0) {
        updateNotificationState({ uncategorisedTransactionsAlerted: false }, UNCATEGORISED_NOTIFICATION_ID, null);
    } else if (!uncategorisedTransactionsAlerted || notification)
        updateNotificationState(
            { uncategorisedTransactionsAlerted: true },
            UNCATEGORISED_NOTIFICATION_ID,
            "" + uncategorised
        );
};

export const UncategorisedNotificationDefinition: NotificationRuleDefinition = {
    id: UNCATEGORISED_NOTIFICATION_ID,
    updateNotificationState: update,
    display: (alert) => ({
        icon: Payment,
        title: "Uncategorised Transactions",
        dismiss: DefaultDismissNotificationThunk(alert.id),
        colour: Intents.warning.main,
        buttons: [{ text: "View Transactions", onClick: viewUncategorisedTransactions }],
        children: (
            <NotificationContents>
                There are <OrangeNotificationText>{alert.contents}</OrangeNotificationText> transactions which haven’t
                been allocated to categories.
            </NotificationContents>
        ),
    }),
};

const viewUncategorisedTransactions = () => {
    TopHatDispatch(
        AppSlice.actions.setPageState({
            ...DefaultPages.transactions,
            table: {
                filters: {
                    ...DefaultPages.transactions.table.filters,
                    category: [PLACEHOLDER_CATEGORY_ID],
                },
                state: DefaultPages.transactions.table.state,
            },
        })
    );
};
