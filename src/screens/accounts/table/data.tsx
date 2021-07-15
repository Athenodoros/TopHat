import { groupBy, toPairs, values } from "lodash";
import { filterListByID, filterListByIDs } from "../../../components/table";
import { useAccountsPageState } from "../../../state/app/hooks";
import { Account } from "../../../state/data";
import { useAllAccounts, useInstitutionMap } from "../../../state/data/hooks";
import { ID } from "../../../state/utilities/values";

export interface AccountsInstitutionSummary {
    id: ID | undefined;
    name: string | undefined;
    colour: string | undefined;
    icon: string | undefined;
    accounts: Account[];
}

const MISSING_INSTITUTION_PLACEHOLDER = -1;
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
    return toPairs(groupBy(accounts, (account) => account.institution || MISSING_INSTITUTION_PLACEHOLDER)).map(
        ([idStr, accounts]) => {
            const institution = institutionMetadataMap[idStr];

            return {
                id: institution?.id,
                name: institution?.name,
                colour: institution?.colour,
                icon: institution?.icon,
                accounts,
            };
        }
    );
};
