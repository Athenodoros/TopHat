import { groupBy, keys, sortBy, toPairs, values } from "lodash";
import { filterListByID, filterListByIDs } from "../../../components/table";
import { useAccountsPageState } from "../../../state/app/hooks";
import { Account, PLACEHOLDER_INSTITUTION_ID } from "../../../state/data";
import { useAllAccounts, useInstitutionMap } from "../../../state/data/hooks";
import { ID } from "../../../state/shared/values";

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
            (filters.filterInactive === false || !account.isInactive) &&
            filterListByID(filters.account, account.id) &&
            filterListByID(filters.institution, account.institution) &&
            filterListByID(filters.type, account.category) &&
            filterListByIDs(filters.currency, keys(account.balances).map(Number)) &&
            (filters.balances === "all" ||
                values(account.balances).some(({ localised: [balance] }) => {
                    // prettier-ignore
                    return balance && ((balance > 0) === (filters.balances === "credits"));
                }))
    );

    const institutionMetadataMap = useInstitutionMap();
    const institutions = toPairs(groupBy(accounts, (account) => account.institution)).map(([idStr, accounts]) => ({
        ...institutionMetadataMap[idStr]!,
        accounts,
    }));

    return sortBy(institutions, (institution) => [institution.id === PLACEHOLDER_INSTITUTION_ID, institution.id]);
};
