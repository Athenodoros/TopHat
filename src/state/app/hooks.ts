import { identity } from "lodash";
import { DialogState } from ".";
import { useSelector } from "../shared/hooks";
import {
    AccountPageState,
    AccountsPageState,
    CategoriesPageState,
    CategoryPageState,
    TransactionsPageState,
} from "./pageTypes";

export const useAccountsPageState = <T = AccountsPageState>(
    selector: (state: AccountsPageState) => T = identity,
    equalityFn?: (left: T, right: T) => boolean
) => useSelector<T>((state) => selector(state.app.page as AccountsPageState), equalityFn);

export const useAccountPageState = <T = AccountPageState>(
    selector: (state: AccountPageState) => T = identity,
    equalityFn?: (left: T, right: T) => boolean
) => useSelector<T>((state) => selector(state.app.page as AccountPageState), equalityFn);
export const useAccountPageAccount = () =>
    useSelector((state) => state.data.account.entities[(state.app.page as AccountPageState).account]!);

export const useTransactionsPageState = <T = TransactionsPageState>(
    selector: (state: TransactionsPageState) => T = identity,
    equalityFn?: (left: T, right: T) => boolean
) => useSelector<T>((state) => selector(state.app.page as TransactionsPageState), equalityFn);

export const useCategoriesPageState = <T = CategoriesPageState>(
    selector: (state: CategoriesPageState) => T = identity,
    equalityFn?: (left: T, right: T) => boolean
) => useSelector<T>((state) => selector(state.app.page as CategoriesPageState), equalityFn);

export const useCategoryPageState = <T = CategoryPageState>(
    selector: (state: CategoryPageState) => T = identity,
    equalityFn?: (left: T, right: T) => boolean
) => useSelector<T>((state) => selector(state.app.page as CategoryPageState), equalityFn);
export const useCategoryPageCategory = () =>
    useSelector((state) => state.data.category.entities[(state.app.page as CategoryPageState).category]!);

export const useDialogPage = () => useSelector((state) => state.app.dialog.id);
type DialogPageID = Exclude<DialogState["id"], "closed">;
export const useDialogState = <ID extends DialogPageID, T = DialogState[ID]>(
    id: ID,
    callback: (state: DialogState[ID]) => T = identity
) => useSelector((state) => callback(state.app.dialog[id]));
export const useDialogHasWorking = () => useSelector(({ app: { dialog } }) => !!dialog[dialog.id as DialogPageID]);
