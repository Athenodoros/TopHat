import { lighten, useTheme } from "@mui/material";
import { Box, SxProps } from "@mui/system";
import { identity } from "lodash";
import React from "react";
import { getChartDomainFunctions } from "../../shared/data";
import { Greys, Intents } from "../../styles/colours";

export const getBasicBarChartColour = (success: boolean | null, stub?: boolean) =>
    success === null
        ? stub
            ? { main: Greys[700], dark: Greys[700] }
            : Intents.primary
        : Intents[success ? "success" : "danger"];

export const BasicBarChart: React.FC<{
    className?: string;
    values: number[];
    selected?: number;
    setSelected?: (index: number) => void;
    sx?: SxProps;
}> = ({ className, sx, values, selected: selectedIndex, setSelected }) => {
    const theme = useTheme();

    const { getPoint, getOffsetAndSizeForRange } = getChartDomainFunctions(values);
    const width = (1 / values.length) * 100 + "%";

    const getColour = (value: number) =>
        getBasicBarChartColour(
            values.some((x) => x < 0) && values.some((x) => x >= 0) ? value >= 0 : null,
            !values.some(identity)
        );

    return (
        <Box sx={sx} className={className} style={{ position: "relative" }}>
            {values.map((value, idx) => {
                const colour = getColour(value);
                const selected = selectedIndex === idx;
                const { offset: bottom, size: height } = getOffsetAndSizeForRange(value, 0);
                const right = (idx / values.length) * 100 + "%";
                const common = {
                    position: "absolute" as const,
                    right,
                    width,
                    transition: theme.transitions.create("all"),
                };

                return (
                    <React.Fragment key={idx}>
                        <div
                            style={{
                                ...common,
                                cursor: setSelected && "pointer",
                                height: "100%",
                                background: selected ? Greys[300] : undefined,
                            }}
                            onClick={setSelected && (() => setSelected(idx))}
                        />
                        <div
                            style={{
                                ...common,
                                pointerEvents: "none",
                                bottom,
                                height,
                                background: lighten(colour.main, selected ? 0.1 : 0.4),
                            }}
                        />
                        <div
                            style={{
                                ...common,
                                bottom: getPoint(value),
                                height: 2,
                                marginTop: -1,
                                background: colour[selected ? "dark" : "main"],
                            }}
                        />
                    </React.Fragment>
                );
            })}
        </Box>
    );
};
