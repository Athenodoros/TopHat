import { range, sum, toPairs, unzip, zip } from "lodash";
import { useMemo } from "react";
import { equalZip } from "../../shared/data";
import { useAllAccounts, useAllCategories } from "../../state/data/hooks";
import { ID } from "../../state/shared/values";

export interface SnapshotSectionData {
    trends: {
        credits: number[];
        debits: number[];
    };
    net: number[];
}

export const useAssetsSnapshot = (account?: ID, currency?: ID) => {
    const accounts = useAllAccounts();

    return useMemo(
        () =>
            getSnapshotDisplayValues(
                accounts
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
                                return (bal && bal > 0 ? [pos + bal, neg] : [pos, neg + (bal || 0)]) as [
                                    number,
                                    number
                                ];
                            }),
                        [] as [number, number][]
                    )
            ),
        [accounts, account, currency]
    );
};

export const useTransactionsSnapshot = (category?: ID): SnapshotSectionData => {
    const categories = useAllCategories();

    return useMemo(
        () =>
            getSnapshotDisplayValues(
                unzip(
                    categories
                        .filter(({ id }) => category === undefined || id === category)
                        .flatMap(({ transactions }) => transactions)
                        .reduce(
                            ([accCredits, accDebits], { credits, debits }) =>
                                [
                                    zip(accCredits, credits).map(([acc, val]) => (acc || 0) + (val || 0)),
                                    zip(accDebits, debits).map(([acc, val]) => (acc || 0) + (val || 0)),
                                ] as [number[], number[]],
                            [[], []] as [number[], number[]]
                        )
                ) as [number, number][]
            ),
        [categories, category]
    );
};

const getSnapshotDisplayValues = (trends: [number, number][]) => {
    const [credits, debits] = trends.length ? unzip(trends) : [range(12).map((_) => 0), range(12).map((_) => 0)];
    const net = equalZip(credits, debits).map(sum);
    return { trends: { credits, debits }, net };
};
