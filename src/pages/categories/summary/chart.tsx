import chroma from "chroma-js";
import { last, max, min, sortBy, sum, sumBy, unzip } from "lodash";
import { DateTime } from "luxon";
import numeral from "numeral";
import { useCallback } from "react";
import { VictoryAxis, VictoryBar, VictoryChart, VictoryGroup, VictoryStack, VictoryTooltip } from "victory";
import { FlexWidthChart } from "../../../components/display/FlexWidthChart";
import { fadeSolidColour } from "../../../components/display/ObjectDisplay";
import { getChartPerformanceProps } from "../../../components/display/PerformantCharts";
import { ChartSign } from "../../../state/app/pageTypes";
import { useDefaultCurrency } from "../../../state/data/hooks";
import { getToday, ID } from "../../../state/shared/values";

export interface CategoriesBarChartPoint {
    id: ID;
    name: string;
    colour: string;
    values: number[];
    budgets: number[];
}
export interface CategoriesBarChartProps {
    sign: ChartSign;
    id?: string;
    series: CategoriesBarChartPoint[];
}
export const CategoriesBarChart: React.FC<CategoriesBarChartProps> = ({ sign, id, series }) => {
    const { symbol } = useDefaultCurrency();

    const { totals, budgets, domain } = useBarChartData(series, sign);
    const getChart = useCallback(
        (width: number) => (
            <VictoryChart
                height={310}
                animate={false} // {{ duration: 500, onLoad: { duration: 500 } }}
                padding={{ left: 100, top: 20, bottom: 20, right: 20 }}
                {...getChartPerformanceProps(domain, { x: "time", y: "linear" })}
                key={id} // This stupid trick (often?) prevents a bug with events when chart props change
            >
                {/* {getHiddenTickAxis(BLACK, { orientation: sign === "debits" ? "bottom" : undefined })} */}
                <VictoryAxis
                    dependentAxis={true}
                    tickFormat={(value: number) => symbol + " " + numeral(value).format("0.00a")}
                    crossAxis={false}
                    invertAxis={sign === "debits"}
                />
                <VictoryGroup offset={width * 0.02}>
                    <VictoryStack categories={[]}>
                        {totals.map((points) => (
                            <VictoryBar
                                sortKey="x"
                                key={points.id}
                                data={points.data}
                                barRatio={0.8}
                                style={{
                                    data: {
                                        stroke: points.colour,
                                        fill: fadeSolidColour(points.colour),
                                        strokeWidth: 1,
                                    },
                                }}
                                domain={domain}
                                labelComponent={Tooltip}
                            />
                        ))}
                    </VictoryStack>
                    <VictoryStack categories={[]}>
                        {budgets.map((points) => (
                            <VictoryBar
                                sortKey="x"
                                key={points.id}
                                data={points.data}
                                barRatio={0.8}
                                style={{
                                    data: {
                                        stroke: chroma(points.colour).alpha(0.3).hex(),
                                        fill: chroma(points.colour).alpha(0.2).hex(),
                                        strokeWidth: 1,
                                    },
                                }}
                                domain={domain}
                                labelComponent={Tooltip}
                            />
                        ))}
                    </VictoryStack>
                </VictoryGroup>
                <VictoryAxis
                    tickFormat={(value: Date) => DateTime.fromJSDate(value).toFormat("LLL yyyy")}
                    orientation="bottom"
                />
            </VictoryChart>
        ),
        [totals, budgets, sign, symbol, domain, id]
    );

    return <FlexWidthChart style={CHART_STYLES} getChart={getChart} />;
};

// These are to replicate the MUI <Tooltip /> component
const Tooltip = (
    <VictoryTooltip
        flyoutStyle={{
            borderRadius: 4,
            strokeWidth: 0,
            fill: "rgba(97, 97, 97, 0.92)",
        }}
        flyoutPadding={{
            top: 4,
            bottom: 4,
            left: 8,
            right: 8,
        }}
        style={{ fill: "white", fontFamily: `"Roboto","Helvetica","Arial",sans-serif`, fontSize: 11 }}
        pointerLength={0}
        orientation="top"
        // dy={({ datum }) => (datum.y >= 0 ? -5 : 1)}
    />
);

const CHART_STYLES = { height: 320, display: "flex", justifyContent: "center" } as const;

const useBarChartData = (series: CategoriesBarChartPoint[], sign: ChartSign) => {
    const sorted = sortBy(
        series,
        (s) => sign === "all" && !(s.values.some((x) => x > 0) && s.values.some((x) => x < 0)),
        (s) =>
            (sign !== "debits" ? -sum(s.values.filter((x) => x > 0)) : 0) +
            (sign !== "credits" ? sum(s.values.filter((x) => x < 0)) : 0)
    );

    let totals: { id: ID; colour: string; data: { x: Date; y: number }[] }[] = [];
    let budgets: { id: ID; colour: string; data: { x: Date; y: number }[] }[] = [];

    const getSeriesSubset = (key: "values" | "budgets", type: "credit" | "debit") =>
        sorted
            .filter((point) => point[key].some((x) => (type === "credit" ? x > 0 : x < 0)))
            .map((point) => {
                return {
                    id: point.id,
                    colour: point.colour,
                    data: point[key].map((value, idx) => {
                        const y = Math[type === "credit" ? "max" : "min"](value, 0);

                        return {
                            x: getToday().startOf("months").minus({ months: idx }).toJSDate(),
                            y,
                            label: `${point.name} ${key === "budgets" ? " (Budget)" : ""}: ${numeral(y).format(
                                "0.00a"
                            )}`,
                        };
                    }),
                };
            });

    if (sign !== "debits") {
        totals = totals.concat(getSeriesSubset("values", "credit"));
        budgets = budgets.concat(getSeriesSubset("budgets", "credit"));
    }
    if (sign !== "credits") {
        totals = totals.concat(getSeriesSubset("values", "debit"));
        budgets = budgets.concat(getSeriesSubset("budgets", "debit"));
    }

    const domain = {
        x: [
            DateTime.fromJSDate(min(totals.concat(budgets).map((c) => last(c.data)?.x)) || new Date())
                // .minus({ months: 1 })
                .toJSDate(),
            getToday()
                .startOf("month")
                // .plus({ months: 1 })
                .toJSDate(),
        ] as [Date, Date],
        y: [
            min(
                unzip(totals.map(({ data }) => data))
                    .map((month) => sumBy(month, (point) => Math.min(0, point?.y || 0)))
                    .concat(
                        unzip(budgets.map(({ data }) => data)).map((month) =>
                            sumBy(month, (point) => Math.min(0, point?.y || 0))
                        )
                    )
                    .concat([0])
            ),
            max(
                unzip(totals.map(({ data }) => data))
                    .map((month) => sumBy(month, (point) => Math.max(0, point?.y || 0)))
                    .concat(
                        unzip(budgets.map(({ data }) => data)).map((month) =>
                            sumBy(month, (point) => Math.max(0, point?.y || 0))
                        )
                    )
                    .concat([0])
            ),
        ] as [number, number],
    };

    return { totals, budgets, domain };
};
