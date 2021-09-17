import { mean, range, sum, zip } from "lodash";
import { useMemo } from "react";
import { getBasicChartSpecs } from "../../../components/display/BasicBarChart";
import { useCategoryGraph } from "../../../components/display/CategoryMenu";
import { CategoriesPageState } from "../../../state/app/pageTypes";

const MetricLookbackPeriods: Record<CategoriesPageState["metric"], number> = {
    previous: 1,
    average: 12,
};
export const useCategoriesTableData = (
    metric: CategoriesPageState["metric"],
    tableSign: CategoriesPageState["tableSign"]
) => {
    const { options: ids, graph, entities } = useCategoryGraph();
    const lookback = MetricLookbackPeriods[metric];

    const { options, fillbarDomainSpecs } = useMemo(() => {
        let options = ids.map((id) => {
            const category = entities[id]!;
            const value =
                mean(
                    range(lookback).map(
                        (i) => (category.transactions.credits[i] || 0) + (category.transactions.debits[i] || 0)
                    )
                ) * (tableSign === "debits" ? -1 : 1);
            const budget = category.budgets
                ? mean(range(lookback).map((i) => category.budgets!.values[i] || 0)) * (tableSign === "debits" ? -1 : 1)
                : undefined;

            const isDebitCategory =
                mean(zip(category.transactions.credits, category.transactions.debits).map(sum)) <= 0;

            return {
                id,
                name: category.name,
                colour: category.colour,
                value,
                budget,
                success: budget !== undefined ? (tableSign !== "debits" ? value >= budget : value <= budget) : null,
                isDebitCategory,
            };
        });
        if (tableSign !== "all")
            options = options.filter((option) => option.isDebitCategory === (tableSign === "debits"));

        const fillbarDomainSpecs = getBasicChartSpecs(
            options.map(({ value, budget }) => (Math.abs(value) > Math.abs(budget || 0) ? value : budget || 0)),
            0.1
        );

        return { options, fillbarDomainSpecs };
    }, [ids, entities, lookback, tableSign]);

    return { options, graph, fillbarDomainSpecs };
};
