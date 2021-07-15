import { last, max, min, sortBy, sumBy, unzip } from "lodash";
import { DateTime } from "luxon";
import numeral from "numeral";
import React, { useCallback, useMemo } from "react";
import { VictoryAxis, VictoryBar, VictoryChart, VictoryStack } from "victory";
import { ChartSign } from "../../state/app/types";
import { useDefaultCurrency } from "../../state/data/hooks";
import { formatDate, formatJSDate, getToday, ID } from "../../state/utilities/values";
import { BLACK, Greys } from "../../styles/colours";
import { FlexWidthChart } from "../display/FlexWidthChart";
import { getChartPerformanceProps, getHiddenTickAxis } from "../display/PerformantCharts";
import { ChartPoint, CHART_SECTION_STYLE, EMPTY_ID_PLACEHOLDER, getChartEvents, SummaryChartSign } from "./utilities";

interface SummaryBarChartPoint {
    id: ID | null;
    colour?: string;
    value: { credit: number; debit: number };
    trend: { credits: number[]; debits: number[] };
}
type SummaryBarChartProps = {
    series: SummaryBarChartPoint[];
    sign: ChartSign;
    setFilter: (id: ID, sign: SummaryChartSign, fromDate: string, toDate: string) => void;
    id?: string;
    highlightSeries?: boolean;
};
export const SummaryBarChart: React.FC<SummaryBarChartProps> = ({ series, sign, setFilter, id, highlightSeries }) => {
    const { symbol } = useDefaultCurrency();

    const { charts, domain } = useChartData(series, sign);
    const getChart = useCallback(
        () => (
            <VictoryChart
                height={310}
                animate={false} // {{ duration: 500, onLoad: { duration: 500 } }}
                padding={{ left: 100, top: 20, bottom: 20, right: 20 }}
                {...getChartPerformanceProps(domain, { x: "time", y: "linear" })}
                key={id} // This stupid trick (often?) prevents a bug with events when chart props change
            >
                {getHiddenTickAxis(BLACK, { orientation: sign === "debits" ? "bottom" : undefined })}
                <VictoryAxis
                    dependentAxis={true}
                    tickFormat={(value: number) => symbol + " " + numeral(value).format("0.00a")}
                    crossAxis={false}
                    invertAxis={sign === "debits"}
                />
                <VictoryStack
                    categories={[]}
                    events={getChartEvents(
                        (props: SummaryChartEvent) =>
                            setFilter(
                                props.datum.id,
                                props.datum.sign,
                                formatJSDate(props.datum.x),
                                formatDate(DateTime.fromJSDate(props.datum.x).plus({ months: 1 }).minus({ days: 1 }))
                            ),
                        highlightSeries
                    )}
                >
                    {charts
                        .filter((_) => _.some((p) => p.y))
                        .map((points) => (
                            <VictoryBar
                                sortKey="x"
                                key={points[0].id}
                                data={points}
                                barRatio={0.8}
                                style={CHART_SECTION_STYLE}
                                domain={domain}
                            />
                        ))}
                </VictoryStack>
            </VictoryChart>
        ),
        [charts, sign, setFilter, symbol, domain, id, highlightSeries]
    );

    return <FlexWidthChart style={{ height: 320, display: "flex", justifyContent: "center" }} getChart={getChart} />;
};

interface SummaryChartPoint extends ChartPoint {
    x: Date;
    y: number;
}
interface SummaryChartEvent {
    style: React.CSSProperties;
    datum: SummaryChartPoint;
    data: SummaryChartPoint[];
    index: number;
}

const useChartData = (series: SummaryBarChartPoint[], sign: ChartSign) =>
    useMemo(() => {
        const sorted = sortBy(
            series,
            (s) => sign === "all" && !(s.value.credit && s.value.debit),
            (s) => (sign !== "debits" ? -s.value.credit : 0) + (sign !== "credits" ? s.value.debit : 0)
        );

        const charts = sorted.flatMap((category) =>
            (sign === "all" ? (["credits", "debits"] as const) : [sign]).map((trend) =>
                category.trend[trend].map(
                    (y, idx) =>
                        ({
                            id: category.id || EMPTY_ID_PLACEHOLDER,
                            x: getToday().startOf("months").minus({ months: idx }).toJSDate(),
                            y,
                            colour: category.colour || Greys[400],
                            sign: trend,
                        } as SummaryChartPoint)
                )
            )
        );

        const domain = {
            x: [
                DateTime.fromJSDate(min(charts.map((c) => last(c)?.x)) || new Date())
                    .minus({ months: 1 })
                    .toJSDate(),
                getToday().startOf("month").plus({ months: 1 }).toJSDate(),
            ] as [Date, Date],
            y: [
                min(
                    unzip(charts)
                        .map((month) => sumBy(month, (point) => Math.min(0, point?.y || 0)))
                        .concat([0])
                ),
                max(
                    unzip(charts)
                        .map((month) => sumBy(month, (point) => Math.max(0, point?.y || 0)))
                        .concat([0])
                ),
            ] as [number, number],
        };

        return { charts, domain };
    }, [series, sign]);
