import { makeStyles } from "@material-ui/core";
import { sumBy } from "lodash-es";
import React, { useMemo } from "react";
import { VictoryPie, VictoryPieProps } from "victory";
import { ChartSign } from "../../../state/app/types";
import { ID } from "../../../state/utilities/values";
import { Greys } from "../../../styles/colours";
import { ChartPoint, CHART_SECTION_STYLE, EMPTY_ID_PLACEHOLDER, getChartEvents } from "../utilities";

const useStyles = makeStyles({
    container: {
        flexShrink: 0,
        padding: 10,
        borderRadius: "50%",
        background: Greys[100],
        alignSelf: "center",
        marginTop: 20,
    },
});

interface PieChartDatum extends ChartPoint {
    value: number;
}
interface SummaryPieEventProps {
    style: React.CSSProperties;
    datum: PieChartDatum;
}

interface SummaryPieChartPoint {
    id: ID | null;
    colour?: string;
    value: {
        credit: number;
        debit: number;
    };
}
type SummaryPieChartProps = {
    series: SummaryPieChartPoint[];
    sign: ChartSign;
    setFilter: (id: ID) => void;
};
export const SummaryPieChart: React.FC<SummaryPieChartProps> = ({ series, sign, setFilter }) => {
    const classes = useStyles();

    const credits = useMaybePieChartData("credits", series, sign);
    const debits = useMaybePieChartData("debits", series, sign);

    const getPie = useGetPie(setFilter);

    const totalCredits = sumBy(series, (p) => p.value.credit);
    const totalDebits = sumBy(series, (p) => Math.abs(p.value.debit));
    const maxPieSize = Math.max(totalCredits, totalDebits);

    return (
        <svg height={125} width={125} className={classes.container}>
            {sign === "all" ? (
                <>
                    {getPie(credits, 35, 50, maxPieSize && (totalCredits / maxPieSize) * 360)}
                    {getPie(debits, 15, 30, maxPieSize && (totalDebits / maxPieSize) * 360)}
                </>
            ) : (
                <>
                    {getPie(credits, 25, 50)}
                    {getPie(debits, 25, 50)}
                </>
            )}
        </svg>
    );
};

const useGetPie = (setFilter: (id: ID) => void) => {
    const props = useMemo<VictoryPieProps>(
        () => ({
            y: "value",
            x: "id",
            standalone: false,
            width: 105,
            height: 105,
            animate: false,
            // animate: { duration: 500, onLoad: { duration: 500 } },
            labels: () => null,
            padAngle: 5,
            events: getChartEvents(
                ({ datum: { id } }: SummaryPieEventProps) => id !== EMPTY_ID_PLACEHOLDER && setFilter(id)
            ),
            style: CHART_SECTION_STYLE,
        }),
        [setFilter]
    );

    return (points: PieChartDatum[] | undefined, innerRadius: number, radius: number, endAngle?: number) =>
        points && (
            <VictoryPie data={points.filter(({ value }) => value)} {...props} {...{ innerRadius, radius, endAngle }} />
        );
};

const useMaybePieChartData = (sign: "credits" | "debits", series: SummaryPieChartPoint[], selectedSign: ChartSign) =>
    useMemo(
        () =>
            selectedSign === "all" || selectedSign === sign
                ? series.map(
                      (p) =>
                          ({
                              id: p.id || EMPTY_ID_PLACEHOLDER,
                              colour: p.colour || Greys[400],
                              value: Math.abs(p.value[sign === "credits" ? "credit" : "debit"]),
                          } as PieChartDatum)
                  )
                : undefined,
        [sign, series, selectedSign]
    );