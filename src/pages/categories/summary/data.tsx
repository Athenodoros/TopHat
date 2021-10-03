import { mean, range } from "lodash";
import numeral from "numeral";
import { useMemo } from "react";
import { SummaryBreakdownDatum } from "../../../components/summary";
import { useAllCategories } from "../../../state/data/hooks";
import { TRANSFER_CATEGORY_ID } from "../../../state/data/shared";
import { CategoriesBarSummaryPoint } from "./bars";
import { CategoriesBarChartPoint } from "./chart";

export const useCategoryBudgetSummaryData = (): (SummaryBreakdownDatum &
    CategoriesBarSummaryPoint &
    CategoriesBarChartPoint)[] => {
    const categories = useAllCategories();

    return useMemo(() => {
        return categories
            .filter(({ id, hierarchy }) => hierarchy.length === 0 && id !== TRANSFER_CATEGORY_ID)
            .map((category) => {
                const value = mean(
                    range(1, 13).map(
                        (i) => (category.transactions.credits[i] || 0) + (category.transactions.debits[i] || 0)
                    )
                );
                const budget = mean(range(1, 13).map((i) => category.budgets?.values[i] || 0));

                const debit = value < 0;

                return {
                    // Common data
                    id: category.id,
                    name: category.name,
                    colour: category.colour,

                    // SummaryBreakdownDatum
                    value: {
                        credit: 0,
                        debit: 0,
                        [debit ? "debit" : "credit"]: value - budget,
                    },
                    subtitle: category.budgets
                        ? {
                              base: "Monthly Budget",
                              rollover: "Rollover",
                              copy: "Repeated Budget",
                          }[category.budgets!.strategy]
                        : "No Budget",
                    subValue: {
                        type: "string",
                        credit: "",
                        debit: "",
                        [debit ? "debit" : "credit"]: `${numeral(value).format("0.00a")} / ${
                            category.budgets ? numeral(budget).format("0.00a") : "---"
                        }`,
                    },
                    debit,

                    // CategoriesBarSummaryPoint
                    total: value,
                    budget,

                    // CategoriesBarChartPoint, which includes latest month
                    values: range(13).map(
                        (i) => (category.transactions.credits[i] || 0) + (category.transactions.debits[i] || 0)
                    ),
                    budgets: range(13).map((i) => category.budgets?.values[i] || 0),
                };
            });
    }, [categories]);
};
