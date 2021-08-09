import { identity, pick } from "lodash";
import { shallowEqual } from "react-redux";
import { DialogState } from ".";
import { useSelector } from "../utilities/hooks";
import { AccountPageState, AccountsPageState, TransactionsPageState } from "./pageTypes";

export const useAccountsPageState = <T = AccountsPageState>(selector: (state: AccountsPageState) => T = identity) =>
    useSelector((state) => selector(state.app.page as AccountsPageState));

export const useAccountPageState = <T = AccountPageState>(selector: (state: AccountPageState) => T = identity) =>
    useSelector((state) => selector(state.app.page as AccountPageState));
export const useAccountPageAccount = () =>
    useSelector((state) => state.data.account.entities[(state.app.page as AccountPageState).account]!);

export const useTransactionsPageState = <T = TransactionsPageState>(
    selector: (state: TransactionsPageState) => T = identity,
    equalityFn?: (left: T, right: T) => boolean
) => useSelector((state) => selector(state.app.page as TransactionsPageState), equalityFn);

export const useTransactionsPageFilters = () =>
    useTransactionsPageState(
        (state) =>
            pick(
                state,
                "search",
                "tableLimit",
                "searchRegex",
                "account",
                "category",
                "currency",
                "fromDate",
                "toDate",
                "hideStubs",
                "transfers",
                "statement",
                "valueTo",
                "valueFrom"
            ),
        shallowEqual
    );

export const useDialogPage = () => useSelector((state) => state.app.dialog.id);
export const useDialogState = <ID extends Exclude<DialogState["id"], "closed">, T = DialogState[ID]>(
    id: ID,
    callback: (state: DialogState[ID]) => T = identity
) => useSelector((state) => callback(state.app.dialog[id]));
