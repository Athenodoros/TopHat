import styled from "@emotion/styled";
import { lighten } from "@mui/material";
import { Box } from "@mui/system";
import React from "react";
import { ChartDomainFunctions } from "../../shared/data";
import { Greys } from "../../styles/colours";
import { getThemeTransition } from "../../styles/theme";
import { getBasicBarChartColour } from "./BasicBarChart";

interface BasicFillbarProps {
    range: [number, number, number];
    showEndpoint?: boolean;
    minimal?: boolean;
    secondary?: number;
    functions: ChartDomainFunctions;
    success: boolean | null;
}
export const BasicFillbar: React.FC<BasicFillbarProps> = ({
    range,
    showEndpoint,
    minimal,
    secondary,
    functions,
    success,
}) => {
    const colour = getBasicBarChartColour(success, range[0] === range[2]);

    const main = functions.getOffsetAndSizeForRange(range[2], range[1]);
    const faded = functions.getOffsetAndSizeForRange(range[1], range[0]);

    return (
        <ContainerBox>
            <OutlineBox sx={minimal ? MinimalOutlineSx : undefined}>
                {range[2] !== range[1] || range[1] === range[0] ? (
                    <FillerBox
                        sx={minimal ? FillerMinimalSx : undefined}
                        style={{
                            borderRight: "1px solid " + colour.main,
                            borderLeft: "1px solid " + colour.main,
                            background: lighten(colour.main, 0.4),
                            left: main.offset,
                            width: main.size,
                        }}
                    />
                ) : undefined}
                <FillerBox
                    sx={minimal ? MinimalCumulativeSx : CumulativeSx}
                    style={{
                        background: lighten(colour.main, 0.4),
                        left: faded.offset,
                        width: faded.size,
                    }}
                />
                {["100%", "0%"].includes(functions.getPoint(0)) ? undefined : (
                    <ZeroBox style={{ left: functions.getPoint(0) }} />
                )}
            </OutlineBox>
            {showEndpoint ? (
                <ValueBox
                    style={{
                        background: colour.main,
                        left: functions.getPoint(range[2]),
                    }}
                />
            ) : undefined}
            {secondary !== undefined ? <SecondaryBox style={{ left: functions.getPoint(secondary) }} /> : undefined}
        </ContainerBox>
    );
};

const ContainerBox = styled(Box)({
    position: "relative",
    width: "100%",
    height: "100%",
    "& > *": {
        position: "absolute",
    },
});
const OutlineBox = styled(Box)({
    top: "20%",
    width: "100%",
    height: "60%",
    border: "1px solid " + Greys[800],
    borderRadius: 12,
    overflow: "hidden",
});
const MinimalOutlineSx = {
    borderColor: "transparent !important",
    background: Greys[200],
};
const FillerBox = styled(Box)({
    position: "absolute" as const,
    transition: getThemeTransition("all"),
    height: "100%",
    opacity: 0.6,
});
const FillerMinimalSx = { opacity: 1 };
const CumulativeSx = { opacity: 0.2 };
const MinimalCumulativeSx = { opacity: 0.4 };
const ZeroBox = styled(Box)({
    position: "absolute",
    transition: getThemeTransition("all"),
    width: 1,
    height: "100%",
    marginRight: -0.5,
    background: Greys[500],
});
const ValueBox = styled(Box)({
    transition: getThemeTransition("all"),
    width: 4,
    height: "100%",
    marginRight: -2,
});
const SecondaryBox = styled(Box)({
    transition: getThemeTransition("all"),
    top: "5%",
    width: 1.5,
    height: "90%",
    background: Greys[600],
    marginRight: -0.75,
});
