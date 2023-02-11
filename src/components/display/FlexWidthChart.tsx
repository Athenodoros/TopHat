import { Box, SxProps } from "@mui/system";
import React, { useEffect, useState } from "react";
import { VictoryChart } from "victory";
import { useDivBoundingRect } from "../../shared/hooks";

interface FlexWidthChartProps {
    getChart: (width: number) => React.ReactElement<typeof VictoryChart>;
    style?: React.CSSProperties;
    sx?: SxProps;
}
export const FlexWidthChart: React.FC<FlexWidthChartProps> = ({ getChart, style = {}, sx }) => {
    const [{ width }, ref] = useDivBoundingRect();

    const [chart, setChart] = useState<React.ReactNode>();
    useEffect(() => {
        // The chart is first rendered with a bounding box of 0 * 0. In that case, we return undefined
        if (!width) return;

        const chart = getChart(width);
        if (!React.isValidElement(chart)) return;

        setChart(React.cloneElement(chart, { width } as any));
    }, [width, getChart]);

    return (
        <Box style={style} ref={ref} sx={sx}>
            {chart}
        </Box>
    );
};
