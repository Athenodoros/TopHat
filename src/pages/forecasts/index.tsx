import { Page } from "../../components/layout";
import { ForecastPageDebtCalculator } from "./debt";

export const ForecastPage: React.FC = () => (
    <Page title="Forecasts">
        <ForecastPageDebtCalculator />
    </Page>
);
