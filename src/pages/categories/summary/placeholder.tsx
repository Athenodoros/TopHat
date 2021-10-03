import { MenuItem, Select } from "@mui/material";
import { Section } from "../../../components/layout";
import {
    SummaryBarChart,
    SummaryBreakdown,
    SummarySection,
    useTransactionsSummaryData,
} from "../../../components/summary";
import { handleSelectChange } from "../../../shared/events";
import { TopHatDispatch } from "../../../state";
import { AppSlice } from "../../../state/app";
import { useCategoriesPageState } from "../../../state/app/hooks";
import { CategoriesPageState } from "../../../state/app/pageTypes";

export const CategoriesPageNoBudgetSummary: React.FC = () => {
    const sign = useCategoriesPageState((state) => state.summarySign);
    const { data, length } = useTransactionsSummaryData("category");

    return (
        <SummarySection>
            <Section title="Transaction Summary">
                <SummaryBreakdown
                    data={data}
                    sign={sign}
                    creditsName="Monthly Income"
                    debitsName="Monthly Expenses"
                    help={length === 25 ? "Average over previous 24 months" : "Average over all history"}
                />
            </Section>
            <Section
                title=""
                headers={
                    <Select value={sign} onChange={setChartSign} size="small" key="sign">
                        <MenuItem value="all">All Transactions</MenuItem>
                        <MenuItem value="credits">Income</MenuItem>
                        <MenuItem value="debits">Expenses</MenuItem>
                    </Select>
                }
            >
                <SummaryBarChart series={data} sign={sign} id={sign} />
            </Section>
        </SummarySection>
    );
};

const setChartSign = handleSelectChange((summarySign: CategoriesPageState["summarySign"]) =>
    TopHatDispatch(AppSlice.actions.setCategoriesPagePartial({ summarySign }))
);
