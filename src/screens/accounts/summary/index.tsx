import { FormControl, MenuItem, Select } from "@material-ui/core";
import { Section } from "../../../components/layout";
import { SummaryBarChart, SummaryBreakdown, SummarySection } from "../../../components/summary";
import { SummaryChartSign } from "../../../components/summary/utilities";
import { TopHatDispatch } from "../../../state";
import { AppSlice } from "../../../state/app";
import { useAccountsPageState } from "../../../state/app/hooks";
import { AccountsPageAggregations, AccountsPageState } from "../../../state/app/types";
import { zipObject } from "../../../utilities/data";
import { onSelectChange } from "../../../utilities/events";
import { useAccountsSummaryData } from "./data";

export const AccountsPageSummary: React.FC = () => {
    const aggregation = useAccountsPageState((state) => state.chartAggregation);
    const sign = useAccountsPageState((state) => state.chartSign);
    const data = useAccountsSummaryData(aggregation);

    return (
        <SummarySection>
            <Section title="Net Worth" onClick={clearFilter}>
                <SummaryBreakdown
                    data={data}
                    sign={sign}
                    creditsName="Total Assets"
                    debitsName="Total Liabilities"
                    setFilter={setFilterID[aggregation]}
                />
            </Section>
            <Section
                title=""
                headers={[
                    <FormControl variant="outlined" size="small" key="aggregation">
                        <Select value={aggregation} onChange={setAggregation}>
                            <MenuItem value="account">By Account</MenuItem>
                            <MenuItem value="currency">By Currency</MenuItem>
                            <MenuItem value="institution">By Institution</MenuItem>
                            <MenuItem value="type">By Type</MenuItem>
                        </Select>
                    </FormControl>,
                    <FormControl variant="outlined" size="small" key="sign">
                        <Select value={sign} onChange={setChartSign}>
                            <MenuItem value="all">All Balances</MenuItem>
                            <MenuItem value="credits">Assets</MenuItem>
                            <MenuItem value="debits">Liabilities</MenuItem>
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
                    highlightSeries={true}
                />
            </Section>
        </SummarySection>
    );
};

const setAggregation = onSelectChange((chartAggregation: AccountsPageState["chartAggregation"]) =>
    TopHatDispatch(AppSlice.actions.setAccountsPagePartial({ chartAggregation }))
);

const setChartSign = onSelectChange((chartSign: AccountsPageState["chartSign"]) =>
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
