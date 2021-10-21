import { AccountBalance, AccountBalanceWallet } from "@mui/icons-material";
import { Avatar } from "@mui/material";
import { Box } from "@mui/system";
import { sortBy } from "lodash";
import { TopHatDispatch, TopHatStore } from "../../..";
import { OLD_ACCOUNT_AGE_LIMIT } from "../../../../pages/accounts/table/account";
import { Greys, Intents } from "../../../../styles/colours";
import { AppSlice } from "../../../app";
import { DefaultDialogs } from "../../../app/defaults";
import { DataSlice } from "../../../data";
import { useAccountByID, useInstitutionByID } from "../../../data/hooks";
import { StubUserID } from "../../../data/types";
import { getTodayString, ID, parseDate } from "../../../shared/values";
import {
    DefaultDismissNotificationThunk,
    NotificationContents,
    OrangeNotificationText,
    updateNotificationState,
} from "../shared";
import { NotificationRuleDefinition } from "../types";

const ACCOUNTS_NOTIFICATION_ID = "old-accounts";
interface AccountNotificationContents {
    id: ID;
    age: number;
}

const update = () => {
    const { data } = TopHatStore.getState();
    const { accountOutOfDate } = data.user.entities[StubUserID]!;

    const account = sortBy(
        data.account.ids.filter((id) => !accountOutOfDate.includes(id as ID)).map((id) => data.account.entities[id]!),
        (account) => account.lastUpdate
    )[0];

    if (!account) {
        updateNotificationState({}, ACCOUNTS_NOTIFICATION_ID, null);
    } else {
        const age = -Math.floor(parseDate(account.lastUpdate).diffNow("days").days);
        if (age >= OLD_ACCOUNT_AGE_LIMIT) {
            const contents: AccountNotificationContents = { id: account.id, age };
            updateNotificationState({}, ACCOUNTS_NOTIFICATION_ID, JSON.stringify(contents));
        }
    }

    if (account) {
    }
};

export const AccountNotificationDefinition: NotificationRuleDefinition = {
    id: ACCOUNTS_NOTIFICATION_ID,
    updateNotificationState: update,
    display: (alert) => {
        const contents = JSON.parse(alert.contents) as AccountNotificationContents;
        return {
            icon: AccountBalanceWallet,
            title: "Account Not Updated",
            dismiss: DefaultDismissNotificationThunk(alert.id),
            colour: Intents.warning.main,
            buttons: [
                { text: "Upload Statement", onClick: openStatementDialog(contents.id) },
                { text: "Mark Current", onClick: markAccountCurrent(contents.id) },
            ],
            children: <OldAccountContents id={contents.id} age={contents.age} />,
        };
    },
};

const openStatementDialog = (id: ID) => () => {
    TopHatDispatch(
        AppSlice.actions.setDialogPartial({
            id: "import",
            import: {
                ...DefaultDialogs.import,
                account: TopHatStore.getState().data.account.entities[id]!,
            },
        })
    );
};
const markAccountCurrent = (id: ID) => (close: () => void) => {
    TopHatDispatch(DataSlice.actions.updateAccount({ id, changes: { lastUpdate: getTodayString() } }));
    close();
};

const OldAccountContents: React.FC<{ id: ID; age: number }> = ({ id, age }) => {
    const account = useAccountByID(id);
    const institution = useInstitutionByID(account.institution);

    return (
        <NotificationContents>
            The account
            <Box
                sx={{
                    margin: "-2px 4px 0 4px",
                    display: "inline-flex",
                    padding: "1px 6px 1px 3px",
                    background: Greys[100],
                    border: "1px solid " + Greys[300],
                    borderRadius: 4,
                    alignItems: "center",
                    verticalAlign: "middle",
                }}
            >
                <Avatar
                    src={institution?.icon}
                    sx={{
                        height: 16,
                        width: 16,
                        borderRadius: 3,
                        marginRight: 5 / 8,
                    }}
                >
                    <AccountBalance style={{ height: "60%" }} />
                </Avatar>
                <strong>{account.name}</strong>
            </Box>
            has not been updated in <OrangeNotificationText>{age}</OrangeNotificationText> days.
        </NotificationContents>
    );
};
