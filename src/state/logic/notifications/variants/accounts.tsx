import { AccountBalance, AccountBalanceWallet } from "@mui/icons-material";
import { Avatar } from "@mui/material";
import { Box } from "@mui/system";
import { isEqual, sortBy } from "lodash";
import { TopHatDispatch, TopHatStore } from "../../..";
import { getAccountUpdateAgeLevel } from "../../../../pages/accounts/table/account";
import { Greys, Intents } from "../../../../styles/colours";
import { AppSlice } from "../../../app";
import { DefaultDialogs } from "../../../app/defaults";
import { DataSlice, DataState, ensureNotificationExists, removeNotification } from "../../../data";
import { useAccountByID, useInstitutionByID } from "../../../data/hooks";
import { StubUserID } from "../../../data/types";
import { ID, getTodayString } from "../../../shared/values";
import { DefaultDismissNotificationThunk, NotificationContents, OrangeNotificationText } from "../shared";
import { ACCOUNTS_NOTIFICATION_ID, NotificationRuleDefinition } from "../types";

interface AccountNotificationContents {
    id: ID;
    age: number;
}

const update = (data: DataState) => {
    const { accountOutOfDate } = data.user.entities[StubUserID]!;

    const account = sortBy(
        data.account.ids
            .filter((id) => !accountOutOfDate.includes(id as ID))
            .map((id) => data.account.entities[id]!)
            .filter((account) => !account.isInactive),
        (account) => account.lastUpdate
    )[0];

    if (!account) {
        removeNotification(data, ACCOUNTS_NOTIFICATION_ID);
    } else {
        const { age, level } = getAccountUpdateAgeLevel(account);

        if (level === "danger") {
            const contents: AccountNotificationContents = { id: account.id, age: Math.floor(age!) };
            ensureNotificationExists(data, ACCOUNTS_NOTIFICATION_ID, JSON.stringify(contents));
        }
    }
};

export const AccountNotificationDefinition: NotificationRuleDefinition = {
    id: ACCOUNTS_NOTIFICATION_ID,
    display: (alert) => {
        const contents = JSON.parse(alert.contents) as AccountNotificationContents;
        return {
            icon: AccountBalanceWallet,
            title: "Account Not Updated",
            dismiss: dismiss(contents.id),
            colour: Intents.warning.main,
            buttons: [
                { text: "Upload Statement", onClick: openStatementDialog(contents.id) },
                { text: "Mark Current", onClick: markAccountCurrent(contents.id) },
            ],
            children: <OldAccountContents id={contents.id} age={contents.age} />,
        };
    },
    maybeUpdateState: (previous, current) => {
        if (
            !isEqual(previous?.account, current.account) ||
            !isEqual(
                previous?.user.entities[StubUserID]!.accountOutOfDate,
                current.user.entities[StubUserID]!.accountOutOfDate
            ) ||
            previous?.notification.entities[ACCOUNTS_NOTIFICATION_ID]?.contents !==
                current.notification.entities[ACCOUNTS_NOTIFICATION_ID]?.contents
        )
            update(current);
    },
};

const dismiss = (account: ID) => (closedProgrammatically: boolean) => {
    DefaultDismissNotificationThunk(ACCOUNTS_NOTIFICATION_ID)();

    if (!closedProgrammatically)
        TopHatDispatch(
            DataSlice.actions.updateUserPartial({
                accountOutOfDate: TopHatStore.getState().data.user.entities[StubUserID]!.accountOutOfDate.concat([
                    account,
                ]),
            })
        );
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
                    borderRadius: "9999px",
                    alignItems: "center",
                    verticalAlign: "middle",
                }}
            >
                <Avatar
                    src={institution?.icon}
                    sx={{
                        height: 16,
                        width: 16,
                        borderRadius: "50%",
                        marginRight: 5,
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
