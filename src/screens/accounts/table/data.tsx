import { groupBy, toPairs, values } from "lodash";
import { filterListByID, filterListByIDs } from "../../../components/table";
import { useAccountsPageState } from "../../../state/app/hooks";
import { Account } from "../../../state/data";
import { useAllAccounts, useInstitutionMap } from "../../../state/data/hooks";
import { ID } from "../../../state/utilities/values";

export interface AccountsInstitutionSummary {
    id: ID;
    name: string;
    colour: string;
    icon?: string;
    accounts: Account[];
}

export const useAccountsTableData = () => {
    const filters = useAccountsPageState();
    const accounts = useAllAccounts().filter(
        (account) =>
            (filters.filterInactive === false || account.isActive) &&
            filterListByID(filters.account, account.id) &&
            filterListByID(filters.institution, account.institution) &&
            filterListByID(filters.type, account.category) &&
            filterListByIDs(filters.currency, account.currencies) &&
            (filters.balances === "all" ||
                values(account.balances).some(({ localised: [balance] }) => {
                    // prettier-ignore
                    return balance && ((balance > 0) === (filters.balances === "credits"));
                }))
    );

    const institutionMetadataMap = useInstitutionMap();
    return toPairs(groupBy(accounts, (account) => account.institution)).map(([idStr, accounts]) => ({
        ...institutionMetadataMap[idStr]!,
        accounts,
    }));
};
