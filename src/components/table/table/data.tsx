import { Dictionary } from "@reduxjs/toolkit";
import { groupBy, keys, take, toPairs, uniqBy, zipObject } from "lodash";
import { useEffect, useState } from "react";
import { filterListByID } from "..";
import { takeWithFilter } from "../../../shared/data";
import { Transaction } from "../../../state/data";
import { useAllCategories, useTransactionIDs, useTransactionMap } from "../../../state/data/hooks";
import { ID, SDate } from "../../../state/shared/values";
import { EditTransactionState, TransactionsTableFilters, TransactionsTableFixedDataState } from "./types";

interface TransactionsTableData {
    ids: ID[];
    groups: [SDate, ID[]][];
    metadata: Dictionary<Transaction>;
    more: boolean;
}

export const useTransactionsTableData = (
    filters: TransactionsTableFilters,
    fixed?: TransactionsTableFixedDataState
): TransactionsTableData => {
    const transactions = useTransactionIDs();
    const metadata = useTransactionMap();
    const categories = useAllCategories();

    const [result, setResult] = useState<TransactionsTableData>({
        ids: [],
        groups: [],
        metadata: {},
        more: false,
    });

    useEffect(() => {
        let regex: RegExp;
        try {
            regex = new RegExp(filters.search);
        } catch (e) {
            regex = new RegExp("");
        }

        const included = takeWithFilter(transactions as number[], filters.tableLimit + 1, (id) => {
            const tx = metadata[id]!;

            const search =
                filters.search && filters.searchRegex
                    ? (tx.reference && regex.test(tx.reference)) ||
                      (tx.summary && regex.test(tx.summary)) ||
                      (tx.description && regex.test(tx.description))
                    : filters.search
                    ? tx.reference.toLocaleLowerCase().includes(filters.search.toLocaleLowerCase()) ||
                      tx.summary?.toLocaleLowerCase().includes(filters.search.toLocaleLowerCase()) ||
                      tx.description?.toLocaleLowerCase().includes(filters.search.toLocaleLowerCase())
                    : true;

            const fixedCategoryFilter =
                fixed?.type === "category"
                    ? fixed.nested
                        ? categories
                              .filter(
                                  ({ id, hierarchy }) => id === fixed.category || hierarchy.includes(fixed.category)
                              )
                              .map(({ id }) => id)
                        : [fixed.category]
                    : [];

            return Boolean(
                filterListByID(filters.account, tx.account) &&
                    filterListByID(fixedCategoryFilter, tx.category) &&
                    (filters.category.length === 0 || (tx.value && filterListByID(filters.category, tx.category))) &&
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

        setResult({
            ids: take(included, filters.tableLimit),
            groups: toPairs(groupBy(included, (id) => metadata[id]!.date)),
            metadata,
            more: included.length > filters.tableLimit,
        });
    }, [categories, filters, fixed, metadata, transactions]);

    return result;
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
