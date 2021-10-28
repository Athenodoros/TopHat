import { MenuItem, Select } from "@mui/material";
import chroma from "chroma-js";
import { last, max, min, range, sortBy, sum, sumBy, unzip } from "lodash";
import { DateTime } from "luxon";
import numeral from "numeral";
import { useCallback, useMemo } from "react";
import { VictoryAxis, VictoryBar, VictoryChart, VictoryGroup, VictoryStack, VictoryTooltip } from "victory";
import { FlexWidthChart } from "../../../components/display/FlexWidthChart";
import { fadeSolidColour } from "../../../components/display/ObjectDisplay";
import {
    getBottomAlignedDateAxisFromDomain,
    getChartPerformanceProps,
    getHiddenTickZeroAxis,
} from "../../../components/display/PerformantCharts";
import { Section } from "../../../components/layout";
import { handleSelectChange } from "../../../shared/events";
import { TopHatDispatch } from "../../../state";
import { AppSlice } from "../../../state/app";
import { useCategoriesPageState } from "../../../state/app/hooks";
import { CategoriesPageState, ChartSign } from "../../../state/app/pageTypes";
import { useAllCategories, useDefaultCurrency } from "../../../state/data/hooks";
import { getToday, ID } from "../../../state/shared/values";

export interface CategoriesBarChartPoint {
    id: ID;
    name: string;
    colour: string;
    values: number[];
    budgets: number[];
}
export const CategoriesBarChart: React.FC = () => {
    const { symbol } = useDefaultCurrency();
    const sign = useCategoriesPageState((state) => state.summarySign);

    const { totals, budgets, domain } = useBarChartData(sign);
    const getChart = useCallback(
        (width: number) => (
            <VictoryChart
                height={350}
                // animate={{ duration: 500, onLoad: { duration: 500 } }}
                padding={{ left: 100, top: 20, bottom: 25, right: 20 }}
                {...getChartPerformanceProps(domain, { x: "time", y: "linear" })}
                domainPadding={{ x: width * 0.04 }}
                key={sign} // This stupid trick (often?) prevents a bug with events when chart props change
            >
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
                {getHiddenTickZeroAxis()}
                {getBottomAlignedDateAxisFromDomain(domain.y, sign === "debits")}
            </VictoryChart>
        ),
        [totals, budgets, sign, symbol, domain]
    );

    return (
        <Section
            title="Budget Trend"
            headers={
                <Select value={sign} onChange={setChartSign} size="small">
                    <MenuItem value="all">All Categories</MenuItem>
                    <MenuItem value="credits">Income Categories</MenuItem>
                    <MenuItem value="debits">Expense Categories</MenuItem>
                </Select>
            }
        >
            <FlexWidthChart style={CHART_STYLES} getChart={getChart} />
        </Section>
    );
};

// These are to replicate the MUI <Tooltip /> component
const Tooltip = (
    <VictoryTooltip
        flyoutStyle={{
            borderRadius: "4px",
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

const CHART_STYLES = { height: 360, display: "flex", justifyContent: "center" } as const;

const useBarChartData = (sign: ChartSign) => {
    const categories = useAllCategories();

    return useMemo(() => {
        const series = categories
            .filter(({ hierarchy }) => hierarchy.length === 0)
            .map((category) => ({
                id: category.id,
                name: category.name,
                colour: category.colour,
                values: range(13).map(
                    (i) => (category.transactions.credits[i] || 0) + (category.transactions.debits[i] || 0)
                ),
                budgets: range(13).map((i) => category.budgets?.values[i] || 0),
            }));

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
    }, [categories, sign]);
};

const setChartSign = handleSelectChange((summarySign: CategoriesPageState["summarySign"]) =>
    TopHatDispatch(AppSlice.actions.setCategoriesPagePartial({ summarySign }))
);
