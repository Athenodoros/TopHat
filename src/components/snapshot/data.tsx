import { sum, toPairs, unzip, zip } from "lodash";
import { useMemo } from "react";
import { useAllAccounts, useAllCategories } from "../../state/data/hooks";
import { ID } from "../../state/utilities/values";
import { equalZip } from "../../utilities/data";

export interface SnapshotSectionData {
    trends: {
        credits: number[];
        debits: number[];
    };
    net: number[];
}

export const useAssetsSnapshot = (account?: ID, currency?: ID) => {
    const accounts = useAllAccounts();

    return useMemo(() => {
        const trends = accounts
            .filter(({ id }) => account === undefined || id === account)
            .flatMap(({ balances }) =>
                toPairs(balances)
                    .filter(([id, _]) => currency === undefined || currency === Number(id))
                    .map(([_, balance]) => balance.localised)
            )
            .reduce(
                (accs, balances) =>
                    zip(accs, balances).map(([acc, bal]) => {
                        const [pos, neg] = acc || ([0, 0] as [number, number]);
                        return (bal && bal > 0 ? [pos + bal, neg] : [pos, neg + (bal || 0)]) as [number, number];
                    }),
                [] as [number, number][]
            );
        const [credits, debits] = unzip(trends);
        const net = trends.map(sum);
        return { trends: { credits, debits }, net };
    }, [accounts, account, currency]);
};

export const useTransactionsSnapshot = (category?: ID): SnapshotSectionData => {
    const categories = useAllCategories();

    return useMemo(() => {
        const [credits, debits] = categories
            .filter(({ id }) => category === undefined || id === category)
            .flatMap(({ transactions }) => transactions)
            .reduce(
                ([accCredits, accDebits], { credits, debits }) =>
                    [
                        zip(accCredits, credits).map(([acc, val]) => (acc || 0) + (val || 0)),
                        zip(accDebits, debits).map(([acc, val]) => (acc || 0) + (val || 0)),
                    ] as [number[], number[]],
                [[], []] as [number[], number[]]
            );
        const net = equalZip(credits, debits).map(sum);
        return { trends: { credits, debits }, net };
    }, [categories, category]);
};
