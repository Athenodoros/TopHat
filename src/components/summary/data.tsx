import { max, mean } from "lodash";
import { omit, toPairs, unzip, zip } from "lodash-es";
import { SummaryBarChartPoint, SummaryBreakdownDatum } from ".";
import { takeWithDefault, zipObject } from "../../shared/data";
import { AccountsPageState, TransactionsPageState } from "../../state/app/pageTypes";
import { Category, PLACEHOLDER_CATEGORY_ID, PLACEHOLDER_INSTITUTION_ID } from "../../state/data";
import { useAccountIDs, useAccountMap, useAllObjects, useCurrencyMap, useInstitutionMap } from "../../state/data/hooks";
import { Account, AccountTypeMap, Currency } from "../../state/data/types";
import { ID } from "../../state/shared/values";

export const useTransactionsSummaryData = (
    aggregation: TransactionsPageState["chartAggregation"]
): (SummaryBreakdownDatum & SummaryBarChartPoint)[] => {
    let objects = useAllObjects(aggregation);
    if (aggregation === "category") {
        objects = objects.filter((category) => (category as Category).hierarchy.length === 0);
    }

    const institutions = useInstitutionMap();

    const length = Math.min(
        max(objects.flatMap((_) => [_.transactions.credits.length, _.transactions.debits.length])) || 24,
        24
    );

    return objects.map((object) => {
        const credits = takeWithDefault(object.transactions.credits, length, 0);
        const debits = takeWithDefault(object.transactions.debits, length, 0);

        const colour =
            aggregation === "account"
                ? institutions[(object as Account).institution!]!.colour
                : (object as Exclude<typeof objects[number], Account>).colour;

        return {
            id: object.id,
            name: aggregation === "currency" ? (object as Currency).ticker : object.name,
            subtitle:
                aggregation === "currency"
                    ? (object as Currency).name
                    : aggregation === "account"
                    ? institutions[(object as Account).institution]!.name
                    : undefined,
            colour,
            trend: { credits, debits },
            value: { credit: mean(credits.slice(1)), debit: mean(debits.slice(1)) },
            subValue:
                aggregation === "currency"
                    ? {
                          type: "number",
                          symbol: (object as Currency).symbol,
                          credit: mean(
                              takeWithDefault((object as Currency).transactions.localCredits, length, 0).slice(1)
                          ),
                          debit: mean(
                              takeWithDefault((object as Currency).transactions.localDebits, length, 0).slice(1)
                          ),
                      }
                    : undefined,
            placeholder: aggregation === "category" && object.id === PLACEHOLDER_CATEGORY_ID,
        };
    });
};

type HistorySummary = { credits: number[]; debits: number[]; totals: { credit: number; debit: number } };
export function useBalanceSummaryData(
    aggregation: AccountsPageState["chartAggregation"]
): (SummaryBreakdownDatum & SummaryBarChartPoint)[] {
    const accountIDs = useAccountIDs();
    const accounts = useAccountMap();
    const institutions = useInstitutionMap();
    const currencies = useCurrencyMap();

    // Iterate through all balances and allocate to keyed histories
    const trends: Record<ID, HistorySummary> = {};
    accountIDs.forEach((accountId) => {
        const account = accounts[accountId]!;

        toPairs(account.balances).forEach(([currency, { original, localised }]) => {
            const id = {
                account: account.id,
                currency: Number(currency),
                institution: account.institution || 0,
                type: account.category,
            }[aggregation];

            const history = zip(localised, trends[id]?.credits || [], trends[id]?.debits || []).map(
                ([value, credit, debit]) =>
                    value && value > 0
                        ? [value + (credit || 0), debit || 0]
                        : [credit || 0, (value || 0) + (debit || 0)]
            );
            const currencyTotal = trends[id]?.totals || { credit: 0, debit: 0 };

            trends[id] = {
                ...zipObject(["credits", "debits"], unzip(history)),
                totals: {
                    credit: currencyTotal.credit + (original[0] > 0 ? original[0] : 0),
                    debit: currencyTotal.debit + (original[0] < 0 ? original[0] : 0),
                },
            } as HistorySummary;
        });
    });

    // Create full summaries by category
    return toPairs(trends).map(([strID, trend]) => {
        const id = Number(strID);
        const common = {
            id,
            value: { credit: trend.credits[0], debit: trend.debits[0] },
            trend: omit(trend, ["totals"]),
        };

        if (aggregation === "institution") {
            const institution = institutions[id]!;
            return {
                ...common,
                id,
                name: institution?.name || "No Institution",
                colour: institution.colour,
                placeholder: id === PLACEHOLDER_INSTITUTION_ID,
            };
        }

        if (aggregation === "type")
            return {
                name: AccountTypeMap[id as 1 | 2 | 3].name,
                colour: AccountTypeMap[id as 1 | 2 | 3].colour,
                ...common,
            };

        if (aggregation === "currency") {
            const currency = currencies[id]!;
            return {
                name: currency.ticker,
                colour: currency.colour,
                subtitle: currency.name,
                subValue: { type: "number", symbol: currency.symbol, ...trend.totals },
                ...common,
            };
        }

        const account = accounts[id]!;
        const institution = institutions[account.institution]!;
        return {
            name: account.name,
            subtitle: institution.name,
            colour: institution.colour,
            ...common,
        };
    });
}
