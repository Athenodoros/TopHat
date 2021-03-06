import { MenuItem, Select } from "@mui/material";
import { Box } from "@mui/system";
import { Section, SECTION_MARGIN } from "../../../components/layout";
import { SummaryBreakdown } from "../../../components/summary";
import { handleSelectChange } from "../../../shared/events";
import { TopHatDispatch } from "../../../state";
import { AppSlice } from "../../../state/app";
import { useCategoriesPageState } from "../../../state/app/hooks";
import { CategoriesPageState } from "../../../state/app/pageTypes";
import { CategoriesBarSummary } from "./budget";
import { CategoriesBarChart } from "./chart";
import { useCategoryBudgetSummaryData } from "./data";
import { CategoriesPageNoBudgetSummary } from "./placeholder";

const HelpText: Record<CategoriesPageState["summaryMetric"], string> = {
    current: "All transactions in current month",
    previous: "All transactions in previous month",
    average: "Monthly average over previous 12 months",
};

export const CategoriesPageSummary: React.FC = () => {
    const { summaryMetric: metric } = useCategoriesPageState((state) => state);
    const data = useCategoryBudgetSummaryData(metric);

    if (!data.some((category) => category.budget)) return <CategoriesPageNoBudgetSummary />;

    return (
        <Box
            sx={{
                display: "flex",
                "& > div:first-of-type": { flex: "350px 0 0", marginRight: SECTION_MARGIN },
                "& > div:last-child": { flexGrow: 1 },
            }}
        >
            <Section
                title="Budget"
                headers={[
                    <Select value={metric} onChange={setMetric} size="small" key="metric">
                        <MenuItem value="current">Current Month</MenuItem>
                        <MenuItem value="previous">Previous Month</MenuItem>
                        <MenuItem value="average">12 Month Average</MenuItem>
                    </Select>,
                ]}
                PaperSx={{ height: 410, display: "flex", flexDirection: "column" }}
            >
                <SummaryBreakdown
                    data={data}
                    sign="all"
                    creditsName="Income vs. Budget"
                    debitsName="Expenses vs. Budget"
                    help={HelpText[metric]}
                    colorise={true}
                >
                    <CategoriesBarSummary points={data} />
                </SummaryBreakdown>
            </Section>
            <CategoriesBarChart />
        </Box>
    );
};

const setMetric = handleSelectChange((summaryMetric: CategoriesPageState["summaryMetric"]) =>
    TopHatDispatch(AppSlice.actions.setCategoriesPagePartial({ summaryMetric }))
);
