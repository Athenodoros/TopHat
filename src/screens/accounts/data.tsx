import { toPairs, unzip, zip, zipObject } from "lodash-es";
import { useAccountsPageState } from "../../state/app/hooks";
import { useAccountIDs, useAccountMap, useCurrencyMap, useInstitutionMap } from "../../state/data/hooks";
import { AccountTypeMap } from "../../state/data/types";
import { ID } from "../../state/utilities/values";

type HistorySummary = { credits: number[]; debits: number[] };

export function useAccountsSummaryData() {
    const aggregation = useAccountsPageState((state) => state.chartAggregation);
    const accountIDs = useAccountIDs();
    const accounts = useAccountMap();
    const institutions = useInstitutionMap();
    const currencies = useCurrencyMap();

    // Iterate through all balances and allocate to keyed histories
    const trends: Record<ID, HistorySummary> = {};
    const currencyTotals: Record<ID, { credit: number; debit: number }> = {};
    accountIDs.forEach((accountId) => {
        const account = accounts[accountId]!;

        toPairs(account.balances).forEach(([currency, { local, base }]) => {
            const id = {
                account: account.id,
                currency: Number(currency),
                institution: account.institution || 0,
                type: account.category,
            }[aggregation];

            const history = zip(local, trends[id]?.credits || [], trends[id]?.debits || []).map(
                ([value, credit, debit]) =>
                    value && value > 0
                        ? [value + (credit || 0), debit || 0]
                        : [credit || 0, (value || 0) + (debit || 0)]
            );
            const currencyTotal = currencyTotals[id] || { credit: 0, debit: 0 };

            trends[id] = zipObject(["credits", "debits"], unzip(history)) as HistorySummary;
            currencyTotals[id] = {
                credit: currencyTotal.credit + (base[0] >= 0 ? base[0] : 0),
                debit: currencyTotal.debit + (base[0] || 0),
            };
        });
    });

    // Create full summaries by category
    return toPairs(trends).map(([strID, trend]) => {
        const id = Number(strID);
        const common = { id, value: { credit: trend.credits[0], debit: trend.debits[0] }, trend };

        if (aggregation === "institution") {
            const institution = institutions[id];
            return {
                ...common,
                id: id || null,
                name: institution?.name || "No Institution",
                colour: institution?.colour,
            };
        }

        if (aggregation === "type")
            return { name: AccountTypeMap[id].name, colour: AccountTypeMap[id].colour, ...common };

        if (aggregation === "currency") {
            const currency = currencies[id]!;
            return {
                name: currency.name,
                colour: currency.colour,
                subtitle: currency.longName,
                subValue: { symbol: currency.symbol, ...currencyTotals[id] },
                ...common,
            };
        }

        const account = accounts[id]!;
        const institution = account.institution === undefined ? undefined : institutions[account.institution];
        return {
            name: account.name,
            subtitle: institution?.name,
            colour: institution?.colour,
            ...common,
        };
    });
}
