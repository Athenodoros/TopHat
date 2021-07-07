import { identity } from "lodash";
import { useSelector } from "react-redux";
import { TopHatState } from "..";
import { AccountsPageState } from "./types";

export const useAccountsPageState = <T = AccountsPageState>(selector: (state: AccountsPageState) => T = identity) =>
    useSelector((state: TopHatState) => selector(state.app.page as AccountsPageState));
