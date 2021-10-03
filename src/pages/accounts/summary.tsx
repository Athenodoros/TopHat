import { MenuItem, Select } from "@mui/material";
import { Section } from "../../components/layout";
import { SummaryBarChart, SummaryBreakdown, SummarySection, useBalanceSummaryData } from "../../components/summary";
import { SummaryChartSign } from "../../components/summary/shared";
import { zipObject } from "../../shared/data";
import { handleSelectChange } from "../../shared/events";
import { TopHatDispatch } from "../../state";
import { AppSlice } from "../../state/app";
import { useAccountsPageState } from "../../state/app/hooks";
import { AccountsPageAggregations, AccountsPageState } from "../../state/app/pageTypes";

export const AccountsPageSummary: React.FC = () => {
    const aggregation = useAccountsPageState((state) => state.chartAggregation);
    const sign = useAccountsPageState((state) => state.chartSign);
    const data = useBalanceSummaryData(aggregation);

    return (
        <SummarySection>
            <Section title="Net Worth" onClick={clearFilter}>
                <SummaryBreakdown
                    data={data}
                    sign={sign}
                    creditsName="Assets"
                    debitsName="Liabilities"
                    help="Value at most recent update"
                    setFilter={setFilterID[aggregation]}
                />
            </Section>
            <Section
                title=""
                headers={[
                    <Select value={aggregation} onChange={setAggregation} size="small" key="aggregation">
                        <MenuItem value="account">By Account</MenuItem>
                        <MenuItem value="currency">By Currency</MenuItem>
                        <MenuItem value="institution">By Institution</MenuItem>
                        <MenuItem value="type">By Type</MenuItem>
                    </Select>,
                    <Select value={sign} onChange={setChartSign} size="small" key="sign">
                        <MenuItem value="all">All Balances</MenuItem>
                        <MenuItem value="credits">Assets</MenuItem>
                        <MenuItem value="debits">Liabilities</MenuItem>
                    </Select>,
                ]}
                onClick={clearFilter}
            >
                <SummaryBarChart
                    series={data}
                    sign={sign}
                    setFilter={setFilterID[aggregation]}
                    id={aggregation + sign}
                    highlightSeries={true}
                />
            </Section>
        </SummarySection>
    );
};

const setAggregation = handleSelectChange((chartAggregation: AccountsPageState["chartAggregation"]) =>
    TopHatDispatch(AppSlice.actions.setAccountsPagePartial({ chartAggregation }))
);

const setChartSign = handleSelectChange((chartSign: AccountsPageState["chartSign"]) =>
    TopHatDispatch(AppSlice.actions.setAccountsPagePartial({ chartSign }))
);

const setFilterID = zipObject(
    AccountsPageAggregations,
    AccountsPageAggregations.map(
        (aggregation) => (id: number, sign?: SummaryChartSign, _1?: string, _2?: string) =>
            TopHatDispatch(
                AppSlice.actions.setAccountsPagePartial({
                    ...zipObject(
                        AccountsPageAggregations,
                        AccountsPageAggregations.map((_) => [])
                    ),
                    [aggregation]: [id],
                    balances: sign || "all",
                })
            )
    )
);
const clearFilter = () =>
    TopHatDispatch(
        AppSlice.actions.setAccountsPagePartial({
            ...zipObject(
                AccountsPageAggregations,
                AccountsPageAggregations.map((_) => [])
            ),
            balances: "all",
        })
    );
