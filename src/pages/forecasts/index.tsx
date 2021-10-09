import { Page } from "../../components/layout";
import { ForecastPageDebtCalculator } from "./debt";
import { ForecastPageNetWorthCalculator } from "./net";
import { ForecastPagePensionCalculator } from "./pension";
import { ForecastPageRetirementCalculator } from "./retirement";

export const ForecastPage: React.FC = () => (
    <Page title="Forecasts">
        <ForecastPageDebtCalculator />
        <ForecastPageNetWorthCalculator />
        <ForecastPageRetirementCalculator />
        <ForecastPagePensionCalculator />
    </Page>
);
