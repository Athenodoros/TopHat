import { Help } from "@mui/icons-material";
import { Tooltip } from "@mui/material";
import { Page, Section } from "../../components/layout";
import { Greys } from "../../styles/colours";

export const AnalysisPage: React.FC = () => {
    return (
        <Page title="Analysis">
            <Section
                title="Transactions Histories"
                headers={
                    <Tooltip title="Searchable and filterable trend of transactions over time">
                        <Help style={{ color: Greys[500] }} />
                    </Tooltip>
                }
            >
                Calculator
            </Section>
            <Section
                title="Budget Results"
                headers={
                    <Tooltip title="Comparison of historical budgets and expenditure">
                        <Help style={{ color: Greys[500] }} />
                    </Tooltip>
                }
            >
                Calculator
            </Section>
        </Page>
    );
};
