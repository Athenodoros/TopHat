import { identity, pick } from "lodash";
import { shallowEqual } from "react-redux";
import { useSelector } from "../utilities/hooks";
import { AccountsPageState, TransactionsPageState } from "./types";

export const useAccountsPageState = <T = AccountsPageState>(selector: (state: AccountsPageState) => T = identity) =>
    useSelector((state) => selector(state.app.page as AccountsPageState));

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
