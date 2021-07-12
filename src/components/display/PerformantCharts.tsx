import React from "react";
import { VictoryAxis, VictoryAxisProps, VictoryChartProps } from "victory";

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
) => ({
    domain,
    scale,
    categories,
});
