import React, { useMemo } from "react";
import { VictoryChart } from "victory";
import { useDivBoundingRect } from "../../shared/hooks";

interface FlexWidthChartProps {
    getChart: () => React.ReactElement<VictoryChart>;
    style?: React.CSSProperties;
}
export const FlexWidthChart: React.FC<FlexWidthChartProps> = ({ getChart, style = {} }) => {
    const [{ width }, ref] = useDivBoundingRect();

    const chart = useMemo(() => {
        // The chart is first rendered with a bounding box of 0 * 0. In that case, we return undefined
        if (!width) return;

        const chart: React.ReactElement<VictoryChart> = getChart();
        if (!React.isValidElement(chart)) return;

        return React.cloneElement(chart, { width } as any);
    }, [width, getChart]);

    return (
        <div style={style} ref={ref}>
            {chart}
        </div>
    );
};
