import { identity, reverse, sortBy } from "lodash";
import { DateTime } from "luxon";
import numeral from "numeral";
import React from "react";
import { VictoryAxis, VictoryBar, VictoryChart, VictoryStack } from "victory";
import { ChartSign } from "../../state/app/types";
import { useDefaultCurrency } from "../../state/data/hooks";
import { formatDate, formatJSDate, getToday, ID } from "../../state/utilities/values";
import { Greys } from "../../styles/colours";
import { formatEmpty } from "../../utilities/data";
import { useDivBoundingRect } from "../../utilities/hooks";
import { ChartPoint, CHART_SECTION_STYLE, EMPTY_ID_PLACEHOLDER, getChartEvents } from "./utilities";

interface SummaryBarChartPoint {
    id: ID | null;
    colour?: string;
    value: { credit: number; debit: number };
    trend: { credits: number[]; debits: number[] };
}
type SummaryBarChartProps = {
    series: SummaryBarChartPoint[];
    sign: ChartSign;
    monthly?: boolean;
    setFilter: (id: ID, fromDate: string, toDate: string) => void;
};
export const SummaryBarChart: React.FC<SummaryBarChartProps> = ({ series, sign, setFilter }) => {
    const currency = useDefaultCurrency();

    const [{ width }, chartRef] = useDivBoundingRect();

    const charts = useCharts(series, sign);
    const result = ( // useMemo(
        // () => (
        <VictoryChart
            width={width}
            height={310}
            animate={false}
            // animate={{ duration: 500, onLoad: { duration: 500 } }}
            domainPadding={{ x: [40, 20] as [number, number] }}
            padding={{ left: 100, top: 20, bottom: 20, right: 20 }}
            events={getChartEvents(
                (props: SummaryChartEvent) =>
                    setFilter(
                        props.datum.id,
                        formatJSDate(props.datum.x),
                        formatDate(DateTime.fromJSDate(props.datum.x).plus({ months: 1 }))
                    ),
                true
            )}
            // This stupid trick prevents a bug with events when chart props change
            key={charts.map((points) => points[0].id).join(",")}
        >
            <VictoryAxis tickFormat={formatEmpty} orientation={sign === "debits" ? "bottom" : undefined} />
            <VictoryAxis
                dependentAxis={true}
                tickFormat={(value: number) => currency.symbol + " " + numeral(value).format("0.00a")}
                crossAxis={false}
                invertAxis={sign === "debits"}
            />
            <VictoryStack>
                {charts.map((points) => (
                    <VictoryBar key={points[0].id} data={points} barRatio={0.8} style={CHART_SECTION_STYLE} />
                ))}
            </VictoryStack>
        </VictoryChart>
        // ),
        // [charts, sign, currency.symbol, chartProps]
    );

    return (
        <div style={{ height: "100%", display: "flex", justifyContent: "center" }} ref={chartRef}>
            {result}
        </div>
    );
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

// Utilities
const useCharts = (rawSeries: SummaryBarChartPoint[], sign: ChartSign) =>
    // useMemo(() => {
    {
        const sorted = sortBy(
            rawSeries,
            (s) => sign === "all" && !(s.value.credit && s.value.debit),
            (s) => (sign !== "debits" ? -s.value.credit : 0) + (sign !== "credits" ? s.value.debit : 0)
        );

        return sorted.flatMap((category) =>
            (sign === "all" ? (["credits", "debits"] as const) : [sign])
                .map((trend) =>
                    category.trend[trend]
                        .map(
                            (y, idx) =>
                                ({
                                    id: category.id || EMPTY_ID_PLACEHOLDER,
                                    x: getToday().startOf("months").minus({ months: idx }).toJSDate(),
                                    y,
                                    colour: category.colour || Greys[400],
                                } as SummaryChartPoint)
                        )
                        .filter(identity)
                )
                .map(reverse)
                .filter((points) => points.length)
        );
    }; // , [rawSeries, sign]);
