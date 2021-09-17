import { identity, pick } from "lodash";
import { shallowEqual } from "react-redux";
import { DialogState } from ".";
import { useSelector } from "../utilities/hooks";
import {
    AccountPageState,
    AccountsPageState,
    TransactionsPageState,
    TransactionsTableEditState,
    TransactionsTableFilterState,
    TransactionsTableStateEditFields,
    TransactionsTableStateFilterFields,
} from "./pageTypes";

export const useAccountsPageState = <T = AccountsPageState>(
    selector: (state: AccountsPageState) => T = identity,
    equalityFn?: (left: T, right: T) => boolean
) => useSelector((state) => selector(state.app.page as AccountsPageState), equalityFn);

export const useAccountPageState = <T = AccountPageState>(
    selector: (state: AccountPageState) => T = identity,
    equalityFn?: (left: T, right: T) => boolean
) => useSelector((state) => selector(state.app.page as AccountPageState), equalityFn);
export const useAccountPageAccount = () =>
    useSelector((state) => state.data.account.entities[(state.app.page as AccountPageState).account]!);
export const useAccountPageFilters = (): Omit<TransactionsTableFilterState, "account"> =>
    useAccountPageState((state) => pick(state, ...TransactionsTableStateFilterFields), shallowEqual);

export const useTransactionsPageState = <T = TransactionsPageState>(
    selector: (state: TransactionsPageState) => T = identity,
    equalityFn?: (left: T, right: T) => boolean
) => useSelector((state) => selector(state.app.page as TransactionsPageState), equalityFn);

export const useTransactionsPageFilters = (): TransactionsTableFilterState =>
    useTransactionsPageState((state) => pick(state, ...TransactionsTableStateFilterFields), shallowEqual);

export const useDialogPage = () => useSelector((state) => state.app.dialog.id);
type DialogPageID = Exclude<DialogState["id"], "closed">;
export const useDialogState = <ID extends DialogPageID, T = DialogState[ID]>(
    id: ID,
    callback: (state: DialogState[ID]) => T = identity
) => useSelector((state) => callback(state.app.dialog[id]));
export const useDialogHasWorking = () => useSelector(({ app: { dialog } }) => !!dialog[dialog.id as DialogPageID]);

export const useTransactionsTableEditState = (): TransactionsTableEditState =>
    useTransactionsPageState((state) => pick(state, ...TransactionsTableStateEditFields), shallowEqual);
