import { FormControl, MenuItem, Select } from "@material-ui/core";
import { Section } from "../../../components/layout";
import { SummaryBarChart, SummaryBreakdown, SummarySection } from "../../../components/summary";
import { TopHatDispatch } from "../../../state";
import { AppSlice } from "../../../state/app";
import { useTransactionsPageState } from "../../../state/app/hooks";
import { TransactionsPageAggregations, TransactionsPageState } from "../../../state/app/types";
import { zipObject } from "../../../utilities/data";
import { onSelectChange } from "../../../utilities/events";
import { useTransactionsSummaryData } from "./data";

export const TransactionsPageSummary: React.FC = () => {
    const aggregation = useTransactionsPageState((state) => state.chartAggregation);
    const sign = useTransactionsPageState((state) => state.chartSign);
    const data = useTransactionsSummaryData(aggregation);

    return (
        <SummarySection>
            <Section title="Transaction Summary" onClick={clearFilter}>
                <SummaryBreakdown
                    data={data}
                    sign={sign}
                    creditsName="Monthly Income"
                    debitsName="Monthly Expenses"
                    setFilter={setFilterID[aggregation]}
                />
            </Section>
            <Section
                title=""
                headers={[
                    <FormControl variant="outlined" size="small" key="aggregation">
                        <Select value={aggregation} onChange={setAggregation}>
                            <MenuItem value="account">By Account</MenuItem>
                            <MenuItem value="category">By Category</MenuItem>
                            <MenuItem value="currency">By Currency</MenuItem>
                        </Select>
                    </FormControl>,
                    <FormControl variant="outlined" size="small" key="sign">
                        <Select value={sign} onChange={setChartSign}>
                            <MenuItem value="all">All Transactions</MenuItem>
                            <MenuItem value="credits">Income</MenuItem>
                            <MenuItem value="debits">Expenses</MenuItem>
                        </Select>
                    </FormControl>,
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
};

const setAggregation = onSelectChange((chartAggregation: TransactionsPageState["chartAggregation"]) =>
    TopHatDispatch(AppSlice.actions.setTransactionsPagePartial({ chartAggregation }))
);

const setChartSign = onSelectChange((chartSign: TransactionsPageState["chartSign"]) =>
    TopHatDispatch(AppSlice.actions.setTransactionsPagePartial({ chartSign }))
);

const setFilterID = zipObject(
    TransactionsPageAggregations,
    TransactionsPageAggregations.map(
        (aggregation) => (id: number, fromDate?: string, toDate?: string) =>
            TopHatDispatch(
                AppSlice.actions.setTransactionsPagePartial({
                    ...zipObject(
                        TransactionsPageAggregations,
                        TransactionsPageAggregations.map((_) => [])
                    ),
                    [aggregation]: [id],
                    fromDate,
                    toDate,
                })
            )
    )
);
const clearFilter = () =>
    TopHatDispatch(
        AppSlice.actions.setTransactionsPagePartial({
            ...zipObject(
                TransactionsPageAggregations,
                TransactionsPageAggregations.map((_) => [])
            ),
            fromDate: undefined,
            toDate: undefined,
        })
    );
