import { Page } from "../../components/layout";
import { ForecastPageDebtCalculator } from "./debt";

export const ForecastPage: React.FC = () => (
    <Page title="Forecasts" padding={200}>
        <ForecastPageDebtCalculator />
    </Page>
);
