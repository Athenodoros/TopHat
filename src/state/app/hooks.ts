import { identity } from "lodash";
import { useSelector } from "../utilities/hooks";
import { AccountsPageState, TransactionsPageState } from "./types";

export const useAccountsPageState = <T = AccountsPageState>(selector: (state: AccountsPageState) => T = identity) =>
    useSelector((state) => selector(state.app.page as AccountsPageState));

export const useTransactionsPageState = <T = TransactionsPageState>(
    selector: (state: TransactionsPageState) => T = identity
) => useSelector((state) => selector(state.app.page as TransactionsPageState));
