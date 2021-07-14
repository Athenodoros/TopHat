import { groupBy, toPairs } from "lodash";
import { useMemo } from "react";
import { filterListByID } from "../../../components/table";
import { useTransactionsPageState } from "../../../state/app/hooks";
import { useTransactionIDs, useTransactionMap } from "../../../state/data/hooks";
import { takeWithFilter } from "../../../utilities/data";

export const useTransactionsTableData = () => {
    const transactions = useTransactionIDs();
    const metadata = useTransactionMap();
    const filters = useTransactionsPageState();

    return useMemo(() => {
        const regex = new RegExp(filters.search);

        const included = takeWithFilter(transactions as number[], filters.tableLimit, (id) => {
            const tx = metadata[id]!;

            let search =
                filters.search && filters.searchRegex
                    ? (tx.summary && regex.test(tx.summary)) || (tx.description && regex.test(tx.description))
                    : filters.search
                    ? (tx.summary || tx.reference)?.toLocaleLowerCase().includes(filters.search.toLocaleLowerCase()) ||
                      tx.description?.toLocaleLowerCase().includes(filters.search.toLocaleLowerCase())
                    : true;

            return Boolean(
                filterListByID(filters.account, tx.account) &&
                    filterListByID(filters.category, tx.category) &&
                    filterListByID(filters.currency, tx.currency) &&
                    (!filters.fromDate || tx.date >= filters.fromDate) &&
                    (!filters.toDate || tx.date <= filters.toDate) &&
                    (filters.showStubs || tx.value) &&
                    (filters.transfers === "all" || (filters.transfers === "include") === tx.transfer) &&
                    (filters.statement === "all" || (filters.statement === "include") === tx.statement) &&
                    (filters.valueTo === undefined || tx.value! <= filters.valueTo) &&
                    (filters.valueFrom === undefined || tx.value! >= filters.valueFrom) &&
                    search
            );
        });

        return toPairs(groupBy(included, (id) => metadata[id]!.date));
    }, [transactions, metadata, filters]);
};
