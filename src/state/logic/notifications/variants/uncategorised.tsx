import { Payment } from "@mui/icons-material";
import { isEqual } from "lodash";
import { TopHatDispatch } from "../../..";
import { Intents } from "../../../../styles/colours";
import { AppSlice, DefaultPages } from "../../../app";
import {
    DataState,
    PLACEHOLDER_CATEGORY_ID,
    ensureNotificationExists,
    removeNotification,
    updateUserData,
} from "../../../data";
import { StubUserID } from "../../../data/types";
import { DefaultDismissNotificationThunk, NotificationContents, OrangeNotificationText } from "../shared";
import { NotificationRuleDefinition, UNCATEGORISED_NOTIFICATION_ID } from "../types";

const update = (data: DataState) => {
    const { uncategorisedTransactionsAlerted } = data.user.entities[StubUserID]!;

    const uncategorised = data.transaction.ids.filter((id) => {
        const tx = data.transaction.entities[id]!;
        return tx.category === PLACEHOLDER_CATEGORY_ID && tx.value;
    }).length;

    const notification = data.notification.entities[UNCATEGORISED_NOTIFICATION_ID];

    if (uncategorised === 0) {
        updateUserData(data, { uncategorisedTransactionsAlerted: false });
        removeNotification(data, UNCATEGORISED_NOTIFICATION_ID);
    } else if (!uncategorisedTransactionsAlerted || notification) {
        updateUserData(data, { uncategorisedTransactionsAlerted: true });
        ensureNotificationExists(data, UNCATEGORISED_NOTIFICATION_ID, "" + uncategorised);
    }
};

export const UncategorisedNotificationDefinition: NotificationRuleDefinition = {
    id: UNCATEGORISED_NOTIFICATION_ID,
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
    maybeUpdateState: (previous, current) => {
        if (!isEqual(previous?.category, current.category)) update(current);
    },
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
