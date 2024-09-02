import { MenuItem, Select } from "@mui/material";
import React from "react";
import { Section } from "../../components/layout";
import {
    SummaryBarChart,
    SummaryBreakdown,
    SummarySection,
    useTransactionsSummaryData,
} from "../../components/summary";
import { SummaryChartSign } from "../../components/summary/shared";
import { TransactionsTableFilters } from "../../components/table/table/types";
import { zipObject } from "../../shared/data";
import { handleSelectChange } from "../../shared/events";
import { TopHatDispatch, TopHatStore } from "../../state";
import { AppSlice } from "../../state/app";
import { useTransactionsPageState } from "../../state/app/hooks";
import { TransactionsPageAggregations, TransactionsPageState } from "../../state/app/pageTypes";
import { ID, SDate } from "../../state/shared/values";

export const TransactionsPageSummary: React.FC = React.memo(() => {
    const aggregation = useTransactionsPageState((state) => state.chartAggregation);
    const sign = useTransactionsPageState((state) => state.chartSign);
    const { data, length } = useTransactionsSummaryData(aggregation);

    return (
        <SummarySection>
            <Section title="Transaction Summary" onClick={clearFilter}>
                <SummaryBreakdown
                    data={data}
                    sign={sign}
                    creditsName="Monthly Income"
                    debitsName="Monthly Expenses"
                    help={length === 25 ? "Average over 2 years to last month" : "Average over history to last month"}
                    setFilter={setFilterID[aggregation]}
                />
            </Section>
            <Section
                title=""
                headers={[
                    <Select value={aggregation} onChange={setAggregation} size="small" key="aggregation">
                        <MenuItem value="account">By Account</MenuItem>
                        <MenuItem value="category">By Category</MenuItem>
                        <MenuItem value="currency">By Currency</MenuItem>
                    </Select>,
                    <Select value={sign} onChange={setChartSign} size="small" key="sign">
                        <MenuItem value="all">All Transactions</MenuItem>
                        <MenuItem value="credits">Income</MenuItem>
                        <MenuItem value="debits">Expenses</MenuItem>
                    </Select>,
                ]}
                onClick={clearFilter}
            >
                <SummaryBarChart
                    series={data}
                    sign={sign}
                    setFilter={setFilterID[aggregation]}
                    id={aggregation + sign}
                />
            </Section>
        </SummarySection>
    );
});

const setAggregation = handleSelectChange((chartAggregation: TransactionsPageState["chartAggregation"]) =>
    TopHatDispatch(AppSlice.actions.setTransactionsPagePartial({ chartAggregation }))
);

const setChartSign = handleSelectChange((chartSign: TransactionsPageState["chartSign"]) =>
    TopHatDispatch(AppSlice.actions.setTransactionsPagePartial({ chartSign }))
);

const updateFilters = (update: Partial<TransactionsTableFilters>) =>
    TopHatDispatch(
        AppSlice.actions.setTransactionsTablePartial({
            filters: {
                ...(TopHatStore.getState().app.page as TransactionsPageState).table.filters,
                ...update,
            },
        })
    );

const getCategoryFilter = (category: ID): ID[] => {
    const { ids, entities } = TopHatStore.getState().data.category;
    const children = ids.filter((id) => entities[id]!.hierarchy.includes(category) || id === category);
    return children.length === 0 ? [category] : (children as ID[]);
};
const setFilterID = zipObject(
    TransactionsPageAggregations,
    TransactionsPageAggregations.map(
        (aggregation) => (id: number, sign?: SummaryChartSign, fromDate?: SDate, toDate?: SDate) =>
            updateFilters({
                ...zipObject(
                    TransactionsPageAggregations,
                    TransactionsPageAggregations.map((_) => [])
                ),
                valueFrom: sign === "credits" ? 0 : undefined,
                valueTo: sign === "debits" ? 0 : undefined,
                [aggregation]: aggregation !== "category" ? [id] : getCategoryFilter(id),
                fromDate,
                toDate,
            })
    )
);
const clearFilter = () =>
    updateFilters({
        ...zipObject(
            TransactionsPageAggregations,
            TransactionsPageAggregations.map((_) => [])
        ),
        fromDate: undefined,
        toDate: undefined,
        valueFrom: undefined,
        valueTo: undefined,
    });
