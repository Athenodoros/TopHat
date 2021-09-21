import { lighten, useTheme } from "@material-ui/core";
import { identity } from "lodash";
import React from "react";
import { Greys, Intents } from "../../styles/colours";

export interface BasicChartDomainFunctions {
    getPoint: (raw: number) => string;
    getOffsetAndSizeForRange: (x: number, y?: number) => { offset: string; size: string };
}
export const getBasicChartFunctions = (values: number[], padding: number = 0): BasicChartDomainFunctions => {
    let min = Math.min(0, ...values);
    let max = Math.max(0, ...values);

    if (min === 0 && max === 0) {
        max = 0.1;
    }

    const valueRange = max - min;
    min -= min ? valueRange * padding : 0;
    max += valueRange * padding;

    const scale = (raw: number) => (raw / (max - min)) * 100 + "%";
    const getPoint = (raw: number) => scale(max - raw);
    const getOffsetAndSizeForRange = (x: number, y: number = 0) => ({
        offset: getPoint(Math.max(x, y)),
        size: scale(Math.abs(x - y)),
    });

    return { getPoint, getOffsetAndSizeForRange };
};

export const getBasicBarChartColour = (success: boolean | null, stub?: boolean) =>
    stub
        ? { main: Greys[700], dark: Greys[700] }
        : Intents[success === null ? "primary" : success ? "success" : "danger"];

export const BasicBarChart: React.FC<{
    className?: string;
    values: number[];
    selected: number;
    setSelected: (index: number) => void;
}> = ({ className, values, selected: selectedIndex, setSelected }) => {
    const theme = useTheme();

    const { getPoint, getOffsetAndSizeForRange } = getBasicChartFunctions(values);
    const width = (1 / values.length) * 100 + "%";

    const getColour = (value: number) =>
        getBasicBarChartColour(
            values.some((x) => x < 0) && values.some((x) => x >= 0) ? value >= 0 : null,
            !values.some(identity)
        );

    return (
        <div className={className} style={{ position: "relative" }}>
            {values.map((value, idx) => {
                const colour = getColour(value);
                const selected = selectedIndex === idx;
                const { offset: top, size: height } = getOffsetAndSizeForRange(value, 0);
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
                                cursor: "pointer",
                                height: "100%",
                                background: selected ? Greys[300] : undefined,
                            }}
                            onClick={() => setSelected(idx)}
                        />
                        <div
                            style={{
                                ...common,
                                pointerEvents: "none",
                                top,
                                height,
                                background: lighten(colour.main, selected ? 0.1 : 0.4),
                            }}
                        />
                        <div
                            style={{
                                ...common,
                                top: getPoint(value),
                                height: 2,
                                marginTop: -1,
                                background: colour[selected ? "dark" : "main"],
                            }}
                        />
                    </React.Fragment>
                );
            })}
        </div>
    );
};
