import { mean, range, sum, zip } from "lodash";
import { useMemo } from "react";
import { useCategoryGraph } from "../../../components/display/CategoryMenu";
import { getChartDomainFunctions } from "../../../shared/data";
import { CategoriesPageState } from "../../../state/app/pageTypes";
import { Category } from "../../../state/data";

export const CategoriesMetricLookbackPeriods: Record<CategoriesPageState["tableMetric"], number[]> = {
    current: [0],
    previous: [1],
    average: range(1, 13),
};
export const useCategoriesTableData = (
    hideEmpty: CategoriesPageState["hideEmpty"],
    metric: CategoriesPageState["tableMetric"],
    tableSign: CategoriesPageState["tableSign"]
) => {
    const { options: ids, graph, entities } = useCategoryGraph();
    const lookback = CategoriesMetricLookbackPeriods[metric];

    const { options, chartFunctions, getCategoryStatistics } = useMemo(() => {
        const getCategoryStatistics = (category: Category) => {
            const value =
                mean(
                    lookback.map(
                        (i) => (category.transactions.credits[i] || 0) + (category.transactions.debits[i] || 0)
                    )
                ) * (tableSign === "debits" ? -1 : 1);
            const budget = category.budgets
                ? mean(lookback.map((i) => category.budgets!.values[i] || 0)) * (tableSign === "debits" ? -1 : 1)
                : undefined;
            const success = budget !== undefined ? (tableSign !== "debits" ? value >= budget : value <= budget) : null;

            return { value, budget, success };
        };

        let options = ids.map((id) => {
            const category = entities[id]!;
            const { value, budget, success } = getCategoryStatistics(category);

            const isDebitCategory =
                mean(zip(category.transactions.credits, category.transactions.debits).map(sum)) <= 0;

            return {
                id,
                name: category.name,
                colour: category.colour,
                value,
                budget,
                success,
                isDebitCategory,
            };
        });
        if (tableSign !== "all")
            options = options.filter((option) => option.isDebitCategory === (tableSign === "debits"));
        if (hideEmpty === "all") options = options.filter((option) => option.value);

        const chartFunctions = getChartDomainFunctions(
            options.map(({ value, budget }) => (Math.abs(value) > Math.abs(budget || 0) ? value : budget || 0)),
            0.1
        );

        return { options, chartFunctions, getCategoryStatistics };
    }, [ids, entities, lookback, tableSign, hideEmpty]);

    return { options, graph, chartFunctions, getCategoryStatistics };
};
