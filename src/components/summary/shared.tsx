import chroma from "chroma-js";
import React from "react";
import { VictoryStyleInterface } from "victory-core";
import { suppressEvent } from "../../shared/events";

export type SummaryChartSign = "credits" | "debits";
export interface ChartPoint {
    id: number;
    colour: string;
    sign: SummaryChartSign;
}
export interface ChartPointEvent {
    style: React.CSSProperties;
    datum: ChartPoint;
}
export const getChartEvents = <T extends ChartPointEvent>(
    onClick: (t: T) => void,
    highlightSeries: boolean = false
) => {
    const mutation = (alpha?: number, transition?: string) => ({
        eventKey: highlightSeries ? "all" : undefined,
        mutation: (event: T) => {
            if (!alpha || !event) return;

            return {
                style: Object.assign({}, event.style, { fill: fadeColour(event.datum.colour, alpha), transition }),
            };
        },
    });

    return [
        {
            childName: "all",
            target: "data" as const,
            eventHandlers: {
                onMouseEnter: () => mutation(0.75, "none"),
                onMouseOut: () => mutation(),
                // onMouseDown has two, so that the styling obeys highlightSeries but onClick only triggers once
                onMouseDown: () => [mutation(1, "none"), { mutation: onClick }],
                onMouseUp: () => mutation(0.75, "fill 500ms cubic-bezier(0.4, 0, 0.2, 1) 0ms"),
                onClick: (event: React.SyntheticEvent) => {
                    suppressEvent(event);
                    return [];
                },
            },
        },
    ];
};

const fadeColour = (colour: string, value: number) => colour && chroma(colour).alpha(value).hex();

export const CHART_SECTION_STYLE: VictoryStyleInterface = {
    data: {
        cursor: "pointer",
        // Sometimes datum.colour is stripped for zero-height sections
        fill: ({ datum }) => fadeColour(datum.colour, 0.5)!,
        stroke: ({ datum }) => datum.colour,
        strokeWidth: 1,
        transition: "fill 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
    },
};
