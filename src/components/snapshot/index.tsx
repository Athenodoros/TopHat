import { AttachMoney, TrendingDown, TrendingUp } from "@mui/icons-material";
import { clone, max, min, reverse } from "lodash";
import React, { useCallback } from "react";
import { VictoryAxis, VictoryBar, VictoryChart, VictoryLine } from "victory";
import { formatNumber } from "../../shared/data";
import { useFormatValue, useMaybeDefaultCurrency } from "../../state/data/hooks";
import { AppColours, Greys, Intents } from "../../styles/colours";
import { getChartPerformanceProps, getHiddenTickZeroAxis } from "../display/PerformantCharts";
import { SummaryNumber } from "../display/SummaryNumber";
import { SnapshotSectionData } from "./data";
export * from "./data";

export interface SnapshotSectionContentsProps {
    data: SnapshotSectionData;
}

export const TransactionSnapshotSummaryNumbers: React.FC<SnapshotSectionContentsProps> = ({
    data: { net, currency: currencyID },
}) => {
    const currency = useMaybeDefaultCurrency(currencyID).symbol;

    const average = ((net[0] || 0) + (net[1] || 0) + (net[2] || 0)) / 3;
    const previous = ((net[3] || 0) + (net[4] || 0) + (net[5] || 0)) / 3;

    return (
        <>
            <SummaryNumber
                icon={AttachMoney}
                primary={{
                    value: `${currency} ${formatNumber(average, { start: "+" })}`,
                    positive: !average ? null : average > 0,
                }}
                subtext="average, last three months"
            />
            <SummaryNumber
                icon={average > previous ? TrendingUp : TrendingDown}
                primary={{
                    value: `${currency} ${formatNumber(average - previous, { start: "+" })}`,
                    positive: average === previous ? null : average > previous,
                }}
                secondary={{
                    value: formatNumber((average - previous) / previous, { start: "+", end: "%" }),
                    positive: average === previous ? null : average > previous,
                }}
                subtext="vs. previous months"
            />
        </>
    );
};

export const BalanceSnapshotSummaryNumbers: React.FC<SnapshotSectionContentsProps> = ({
    data: { net, currency: currencyID },
}) => {
    const currency = useMaybeDefaultCurrency(currencyID).symbol;

    return (
        <>
            <SummaryNumber
                icon={AttachMoney}
                primary={{
                    value: `${currency} ${formatNumber(net[0])}`,
                    positive: !net[0] ? null : net[0] > 0,
                }}
                subtext="value today"
            />
            <SummaryNumber
                icon={TrendingUp}
                primary={{
                    value: `${currency} ${formatNumber(net[0] - net[1], { start: "+" })}`,
                    positive: net[0] === net[1] ? null : net[0] > net[1],
                }}
                secondary={{
                    value: formatNumber((net[0] - net[1]) / net[1], { start: "+", end: "%" }),
                    positive: net[0] === net[1] ? null : net[0] > net[1],
                }}
                subtext="in last month"
            />
        </>
    );
};

export const useGetSummaryChart = (
    { trends: { credits, debits }, net, currency }: SnapshotSectionData,
    height: number = 220
) => {
    const format = useFormatValue({ end: "k", decimals: 1, separator: "" }, currency);

    return useCallback(
        () => (
            <VictoryChart
                height={height}
                padding={{ left: 70, right: 10, top: 10, bottom: 10 }}
                {...getChartPerformanceProps({
                    x: [-0.7, Math.max(credits.length, debits.length)],
                    y: [(min(debits) || 0) * 1.02, (max(credits) || 0) * 1.02],
                })}
            >
                {getHiddenTickZeroAxis(Greys[600])}
                <VictoryAxis
                    dependentAxis={true}
                    tickFormat={format}
                    style={{
                        axis: { stroke: Greys[600] },
                        tickLabels: { fontSize: 12, fill: Greys[600] },
                    }}
                    axisValue={-0.7}
                    crossAxis={false}
                />
                <VictoryBar
                    data={reverse(clone(credits))}
                    barRatio={1}
                    style={{ data: { fill: Intents.success.light, opacity: 0.4 } }}
                    minDomain={-1}
                />
                <VictoryBar
                    data={reverse(clone(debits))}
                    barRatio={1}
                    style={{ data: { fill: Intents.danger.light, opacity: 0.4 } }}
                />
                <VictoryLine data={reverse(clone(net))} style={{ data: { stroke: AppColours.summary.main } }} />
            </VictoryChart>
        ),
        [credits, debits, net, format, height]
    );
};
