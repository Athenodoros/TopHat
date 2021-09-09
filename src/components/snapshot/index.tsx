import { makeStyles } from "@material-ui/core";
import { AttachMoney, TrendingUp } from "@material-ui/icons";
import { clone, max, min, reverse } from "lodash";
import numeral from "numeral";
import React, { useCallback } from "react";
import { VictoryAxis, VictoryBar, VictoryChart, VictoryLine } from "victory";
import { useDefaultCurrency, useFormatValue } from "../../state/data/hooks";
import { AppColours, Greys, Intents } from "../../styles/colours";
import { FlexWidthChart } from "../display/FlexWidthChart";
import { getChartPerformanceProps, getHiddenTickAxis } from "../display/PerformantCharts";
import { SummaryNumber } from "../display/SummaryNumber";
import { SnapshotSectionData } from "./data";
export * from "./data";

export interface SnapshotSectionContentsProps {
    data: SnapshotSectionData;
}

const useStyles = makeStyles({
    container: {
        display: "flex",
        width: "100%",
    },
});
export const SnapshotSectionContents: React.FC<SnapshotSectionContentsProps> = ({ data: { trends, net } }) => {
    const classes = useStyles();

    const currency = useDefaultCurrency().symbol;
    const getAssetsChart = useSummaryChart(trends, net);

    return (
        <div className={classes.container}>
            <div>
                <SummaryNumber
                    icon={AttachMoney}
                    primary={{
                        value: `${currency} ${numeral(net[0]).format("0,0.00")}`,
                        positive: net[0] > 0,
                    }}
                    subtext="value today"
                />
                <SummaryNumber
                    icon={TrendingUp}
                    primary={{
                        value: `${currency} ${numeral(net[0] - net[1]).format("+0,0.00")}`,
                        positive: net[0] > net[1],
                    }}
                    secondary={{
                        value: numeral((net[0] - net[1]) / net[1]).format("+0.00%"),
                        positive: net[0] > net[1],
                    }}
                    subtext="in last month"
                />
            </div>
            <FlexWidthChart style={{ flexGrow: 1 }} getChart={getAssetsChart} />
        </div>
    );
};

const useSummaryChart = ({ credits, debits }: { credits: number[]; debits: number[] }, net: number[]) => {
    const format = useFormatValue("0a");

    return useCallback(
        () => (
            <VictoryChart
                height={200}
                padding={{ left: 70, right: 10, top: 10, bottom: 10 }}
                {...getChartPerformanceProps({
                    x: [-0.7, Math.max(credits.length, debits.length)],
                    y: [(min(debits) || 0) * 1.02, (max(credits) || 0) * 1.02],
                })}
            >
                {getHiddenTickAxis(Greys[600])}
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
        [credits, debits, net, format]
    );
};
