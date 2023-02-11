import { DateTime } from "luxon";
import React from "react";
import { VictoryAxis, VictoryChartProps } from "victory";
import { DomainTuple } from "victory-core";
import { BLACK } from "../../styles/colours";

const DummyComponent: React.FC<any> = () => <div />;

export const getHiddenTickZeroAxis = (stroke: string = BLACK) => (
    <VictoryAxis
        style={{ axis: { stroke } }}
        tickComponent={<DummyComponent style={{ stroke: "none" }} />}
        tickLabelComponent={<DummyComponent style={{ stroke: "none" }} />}
        axisValue={0.001} // There seems to be a bad falsiness check here, thus 0.001
    />
);

const formatDateValuesForAxis = (value: Date) => DateTime.fromJSDate(value).toFormat("LLL yyyy");
export const getBottomAlignedDateAxisFromDomain = (yDomain: [number, number], flip?: boolean) =>
    getBottomAlignedDateAxis(yDomain[flip ? 1 : 0]);
export const getBottomAlignedDateAxis = (value: number = 0) => (
    <VictoryAxis
        tickFormat={formatDateValuesForAxis}
        axisValue={value || 0.001} // Avoid Victory's dodgy falsiness check
        orientation="bottom"
        style={{
            axis: {
                visibility: "hidden",
            },
        }}
    />
);

// Victory renders charts using an incredibly slow recursive method for many props.
// This fills in some of the major ones manually.
export const getChartPerformanceProps = (
    domain: { x: DomainTuple; y: DomainTuple },
    scale: VictoryChartProps["scale"] = "linear",
    categories: VictoryChartProps["categories"] = []
) => {
    if (!domain) return { domain, scale, categories };
    if (domain.constructor === Array) return { domain: fixEmptyRange(domain), scale, categories };

    return {
        domain: {
            x: fixEmptyRange(domain.x),
            y: fixEmptyRange(domain.y),
        },
        scale,
        categories,
    };
};
const fixEmptyRange = (tuple: DomainTuple | undefined): DomainTuple | undefined =>
    tuple && typeof tuple[0] === "number" ? (!tuple[0] && !tuple[1] ? [0, 0.1] : tuple) : tuple;
