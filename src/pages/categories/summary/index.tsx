import { MenuItem, Select } from "@mui/material";
import { Section } from "../../../components/layout";
import { SummaryBreakdown, SummarySection } from "../../../components/summary";
import { handleSelectChange } from "../../../shared/events";
import { TopHatDispatch } from "../../../state";
import { AppSlice } from "../../../state/app";
import { useCategoriesPageState } from "../../../state/app/hooks";
import { TransactionsPageState } from "../../../state/app/pageTypes";
import { CategoriesBarSummary } from "./bars";
import { CategoriesBarChart } from "./chart";
import { useCategoryBudgetSummaryData } from "./data";

export const CategoriesPageSummary: React.FC = () => {
    const sign = useCategoriesPageState((state) => state.chartSign);
    const data = useCategoryBudgetSummaryData();

    return (
        <SummarySection>
            <Section title="Budgets">
                <SummaryBreakdown
                    data={data}
                    sign={sign}
                    creditsName="Income vs. Budget"
                    debitsName="Expenses vs. Budget"
                    colorise={true}
                >
                    <CategoriesBarSummary points={data} sign={sign} />
                </SummaryBreakdown>
            </Section>
            <Section
                title=""
                headers={[
                    <Select value={sign} onChange={setChartSign} size="small" key="sign">
                        <MenuItem value="all">All Categories</MenuItem>
                        <MenuItem value="credits">Income</MenuItem>
                        <MenuItem value="debits">Expenses</MenuItem>
                    </Select>,
                ]}
            >
                <CategoriesBarChart series={data} sign={sign} id={sign} />
            </Section>
        </SummarySection>
    );
};

const setChartSign = handleSelectChange((chartSign: TransactionsPageState["chartSign"]) =>
    TopHatDispatch(AppSlice.actions.setCategoriesPagePartial({ chartSign }))
);
