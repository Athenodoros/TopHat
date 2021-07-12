import { FormControl, makeStyles, MenuItem, Select } from "@material-ui/core";
import { zipObject } from "lodash";
import { Section, SECTION_MARGIN } from "../../../components/layout";
import { SummaryBarChart, SummaryBreakdown } from "../../../components/summary";
import { TopHatDispatch } from "../../../state";
import { AppSlice } from "../../../state/app";
import { useAccountsPageState } from "../../../state/app/hooks";
import { AccountsPageAggregations, AccountsPageState } from "../../../state/app/types";
import { onSelectChange } from "../../../utilities/events";
import { useAccountsSummaryData } from "./data";

const useStyles = makeStyles({
    container: {
        display: "flex",
    },
    breakdown: {
        width: 300,
        marginRight: SECTION_MARGIN,
    },
    chart: {
        flexGrow: 1,
    },
});

export const AccountsPageSummary: React.FC = () => {
    const classes = useStyles();
    const aggregation = useAccountsPageState((state) => state.chartAggregation);
    const sign = useAccountsPageState((state) => state.chartSign);
    const data = useAccountsSummaryData();

    return (
        <div className={classes.container}>
            <Section title="Net Worth" className={classes.breakdown}>
                <SummaryBreakdown
                    data={data}
                    sign={sign}
                    creditsName="Assets"
                    debitsName="Liabilities"
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
                className={classes.chart}
            >
                <SummaryBarChart
                    series={data}
                    sign={sign}
                    setFilter={setFilterID[aggregation]}
                    id={aggregation + sign}
                />
            </Section>
        </div>
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
        (aggregation) => (id: number, _1?: string, _2?: string) =>
            TopHatDispatch(
                AppSlice.actions.setAccountsPagePartial({
                    account: [],
                    institution: [],
                    type: [],
                    currency: [],
                    [aggregation]: [id],
                })
            )
    )
);
