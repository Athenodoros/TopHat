import { lighten, useTheme } from "@material-ui/core";
import React from "react";
import { Greys, Intents } from "../../styles/colours";

export interface BasicChartDomainSpec {
    domain: { min: number; max: number; range: number };
    stub: boolean;
    mixed: boolean;
}
export const getBasicChartSpecs = (values: number[], padding: number = 0): BasicChartDomainSpec => {
    let min = Math.min(0, ...values);
    let max = Math.max(0, ...values);
    let stub = false;

    if (min === 0 && max === 0) {
        max = 0.1;
        stub = true;
    }

    const valueRange = max - min;
    min -= min ? valueRange * padding : 0;
    max += valueRange * padding;

    return {
        domain: { min, max, range: max - min },
        stub,
        mixed: min < 0 && max > 0,
    };
};
export const getBasicChartPointData = (
    value: number,
    { domain: { min, max, range }, stub, mixed }: BasicChartDomainSpec,
    success?: boolean | null
) => {
    const colour = stub
        ? { main: Greys[700], dark: Greys[700] }
        : Intents[
              success === undefined
                  ? mixed
                      ? value >= 0
                          ? "success"
                          : "danger"
                      : "primary"
                  : success === null
                  ? "primary"
                  : success
                  ? "success"
                  : "danger"
          ];

    const scale = (raw: number) => (raw / range) * 100 + "%";
    const getValue = (raw: number) => scale(mixed ? max - raw : (max || -min) - Math.abs(raw));

    const offset = scale(mixed ? max - Math.max(0, value) : (max || -min) - Math.abs(value));
    const size = scale(Math.abs(value));

    return { colour, offset, size, getValue };
};

export const BasicBarChart: React.FC<{
    className?: string;
    values: number[];
    selected: number;
    setSelected: (index: number) => void;
}> = ({ className, values, selected: selectedIndex, setSelected }) => {
    const theme = useTheme();

    const spec = getBasicChartSpecs(values);
    const width = (1 / values.length) * 100 + "%";

    return (
        <div className={className} style={{ position: "relative" }}>
            {values.map((value, idx) => {
                const { colour, offset: top, size: height, getValue } = getBasicChartPointData(value, spec);

                const selected = selectedIndex === idx;
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
                                top: getValue(value),
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
