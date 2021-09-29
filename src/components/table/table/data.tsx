import { groupBy, keys, take, toPairs, uniqBy, zipObject } from "lodash";
import { useMemo } from "react";
import { filterListByID } from "..";
import { EditTransactionState, Transaction } from "../../../state/data";
import { useTransactionIDs, useTransactionMap } from "../../../state/data/hooks";
import { takeWithFilter } from "../../../utilities/data";
import { TransactionsTableFilters } from "./types";

export const useTransactionsTableData = (filters: TransactionsTableFilters) => {
    const transactions = useTransactionIDs();
    const metadata = useTransactionMap();

    return useMemo(() => {
        const regex = new RegExp(filters.search);

        const included = takeWithFilter(transactions as number[], filters.tableLimit + 1, (id) => {
            const tx = metadata[id]!;

            const search =
                filters.search && filters.searchRegex
                    ? (tx.reference && regex.test(tx.reference)) ||
                      (tx.summary && regex.test(tx.summary)) ||
                      (tx.description && regex.test(tx.description))
                    : filters.search
                    ? tx.reference?.toLocaleLowerCase().includes(filters.search.toLocaleLowerCase()) ||
                      tx.summary?.toLocaleLowerCase().includes(filters.search.toLocaleLowerCase()) ||
                      tx.description?.toLocaleLowerCase().includes(filters.search.toLocaleLowerCase())
                    : true;

            return Boolean(
                filterListByID(filters.account, tx.account) &&
                    filterListByID(filters.category, tx.category) &&
                    filterListByID(filters.currency, tx.currency) &&
                    filterListByID(filters.statement, tx.statement) &&
                    (!filters.fromDate || tx.date >= filters.fromDate) &&
                    (!filters.toDate || tx.date <= filters.toDate) &&
                    (!filters.hideStubs || tx.value) &&
                    (filters.valueTo === undefined || tx.value! <= filters.valueTo) &&
                    (filters.valueFrom === undefined || tx.value! >= filters.valueFrom) &&
                    search
            );
        });

        return {
            ids: take(included, filters.tableLimit),
            groups: toPairs(groupBy(included, (id) => metadata[id]!.date)),
            metadata,
            more: included.length > filters.tableLimit,
        };
    }, [transactions, metadata, filters]);
};

export const getAllCommonTransactionValues = (transactions: Transaction[]) => {
    const dataKeys = keys(transactions[0]).filter((x) => x !== "id") as (keyof Transaction)[];

    return zipObject(
        dataKeys,
        dataKeys.map((key) => {
            const values = uniqBy(transactions, (tx) => tx[key]);
            return values.length === 1 ? values[0][key] : undefined;
        })
    ) as EditTransactionState;
};
