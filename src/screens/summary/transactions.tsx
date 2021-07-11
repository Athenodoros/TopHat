import { AttachMoney, TrendingUp } from "@material-ui/icons";
import { sum, zip } from "lodash";
import numeral from "numeral";
import React, { useMemo } from "react";
import { FlexWidthChart } from "../../components/display/FlexWidthChart";
import { SummaryNumber } from "../../components/display/SummaryNumber";
import { Section } from "../../components/layout";
import { useAllCategories, useDefaultCurrency } from "../../state/data/hooks";
import { equalZip } from "../../utilities/data";
import { SeeMore, useSummaryChart } from "./utilities";

export const SummaryTransactionsSection = () => {
    const currency = useDefaultCurrency().symbol;

    const categories = useAllCategories();
    const { trends, net } = useMemo(() => {
        const [credits, debits] = categories
            .flatMap(({ transactions }) => transactions)
            .reduce(
                ([accCredits, accDebits], { credits, debits }) =>
                    [
                        zip(accCredits, credits).map(([acc, val]) => (acc || 0) + (val || 0)),
                        zip(accDebits, debits).map(([acc, val]) => (acc || 0) + (val || 0)),
                    ] as [number[], number[]],
                [[], []] as [number[], number[]]
            );
        const net = equalZip(credits, debits).map(sum);
        return { trends: { credits, debits }, net };
    }, [categories]);

    const getTransactionsChart = useSummaryChart(trends, net);

    return (
        <Section title="Cash Flow" headers={<SeeMore page="transactions" />}>
            <div>
                <SummaryNumber
                    icon={AttachMoney}
                    primary={{
                        value: `${currency} ${numeral(net[1] + net[2] + net[3]).format("+0,0.00")}`,
                        positive: net[1] + net[2] + net[3] > 0,
                    }}
                    subtext="last 3 months"
                />
                <SummaryNumber
                    icon={TrendingUp}
                    primary={{
                        value: `${currency} ${numeral(net[1] + net[2] + net[3] - net[4] - net[5] - net[6]).format(
                            "+0,0.00"
                        )}`,
                        positive: net[1] + net[2] + net[3] - net[4] - net[5] - net[6] > 0,
                    }}
                    secondary={{
                        value: numeral(
                            (net[1] + net[2] + net[3] - net[4] - net[5] - net[6]) / (net[4] + net[5] + net[6])
                        ).format("+0.00%"),
                        positive: net[1] + net[2] + net[3] - net[4] - net[5] - net[6] > 0,
                    }}
                    subtext="vs previous 3 months"
                />
            </div>
            <FlexWidthChart style={{ flexGrow: 1 }} getChart={getTransactionsChart} />
        </Section>
    );
};
