import { BarChart } from "@mui/icons-material";
import { Box } from "@mui/system";
import { FlexWidthChart } from "../../components/display/FlexWidthChart";
import { SummaryNumber } from "../../components/display/SummaryNumber";
import { Section } from "../../components/layout";
import {
    TransactionSnapshotSummaryNumbers,
    useGetSummaryChart,
    useTransactionsSnapshot,
} from "../../components/snapshot";
import { formatNumber, takeWithDefault } from "../../shared/data";
import { useCategoryPageCategory } from "../../state/app/hooks";
import { useDefaultCurrency } from "../../state/data/hooks";

export const CategoryPageHistory: React.FC = () => {
    const currency = useDefaultCurrency().symbol;

    const category = useCategoryPageCategory();
    const history = useTransactionsSnapshot(category.id);
    const getChart = useGetSummaryChart(
        {
            trends: history.trends,
            net: category.budgets ? takeWithDefault(category.budgets.values, history.net.length, 0) : history.net,
        },
        260
    );

    return (
        <Section title="Transaction History">
            <Box sx={{ display: "flex", width: "100%", height: "100%" }}>
                <Box sx={{ width: 240 }}>
                    <TransactionSnapshotSummaryNumbers data={history} />
                    {category.budgets ? (
                        <SummaryNumber
                            icon={BarChart}
                            primary={{
                                value: `${currency} ${formatNumber(
                                    (category.budgets.values[0] +
                                        category.budgets.values[1] +
                                        category.budgets.values[2]) /
                                        3,
                                    { start: "+" }
                                )}`,
                                positive: null,
                            }}
                            subtext="budget, last three months"
                        />
                    ) : undefined}
                </Box>
                <FlexWidthChart style={{ flexGrow: 1 }} getChart={getChart} />
            </Box>
        </Section>
    );
};
