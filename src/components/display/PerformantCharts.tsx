import React from "react";
import { DomainTuple, VictoryAxis, VictoryAxisProps, VictoryChartProps } from "victory";
import { DomainPropObjectType } from "victory-core";

const DummyComponent: React.FC<any> = () => <div />;

export const getHiddenTickAxis = (stroke: string, props?: VictoryAxisProps) => (
    <VictoryAxis
        style={{ axis: { stroke } }}
        tickComponent={<DummyComponent style={{ stroke: "none" }} />}
        tickLabelComponent={<DummyComponent style={{ stroke: "none" }} />}
        {...props}
    />
);

// Victory renders charts using an incredibly slow recursive method for many props.
// This fills in some of the major ones manually.
export const getChartPerformanceProps = (
    domain: VictoryChartProps["domain"],
    scale: VictoryChartProps["scale"] = "linear",
    categories: VictoryChartProps["categories"] = []
) => {
    if (!domain) return { domain, scale, categories };
    if (domain.constructor === Array) return { domain: fixEmptyRange(domain), scale, categories };

    return {
        domain: {
            x: fixEmptyRange((domain as DomainPropObjectType).x),
            y: fixEmptyRange((domain as DomainPropObjectType).y),
        } as DomainPropObjectType,
        scale,
        categories,
    };
};
const fixEmptyRange = (tuple: DomainTuple | undefined): DomainTuple | undefined =>
    tuple && typeof tuple[0] === "number" ? (!tuple[0] && !tuple[1] ? [0, 0.1] : tuple) : tuple;
