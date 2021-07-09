import chroma from "chroma-js";
import React from "react";
import { VictoryStyleInterface } from "victory-core";

export interface ChartPoint {
    id: number;
    colour: string;
}
export interface ChartPointEvent {
    style: React.CSSProperties;
    datum: ChartPoint;
}
export const EMPTY_ID_PLACEHOLDER = -1;
export const getChartEvents = <T extends ChartPointEvent>(
    onClick: (t: T) => void,
    highlightSeries: boolean = false
) => {
    const mutation = (alpha?: number, transition?: string) => ({
        eventKey: highlightSeries ? "all" : undefined,
        mutation: (event: T) => {
            if (!alpha || !event || event.datum.id === EMPTY_ID_PLACEHOLDER) return;

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
            },
        },
    ];
};

const fadeColour = (colour: string | undefined, value: number) => colour && chroma(colour).alpha(value).hex();

export const CHART_SECTION_STYLE: VictoryStyleInterface = {
    data: {
        cursor: ({ datum }) => (datum.id !== EMPTY_ID_PLACEHOLDER ? "pointer" : "inherit"),
        // Sometimes datum.colour is stripped for zero-height sections
        fill: ({ datum }) => fadeColour(datum.colour, 0.5)!,
        stroke: ({ datum }) => datum.colour,
        strokeWidth: ({ datum }) => (datum.id !== EMPTY_ID_PLACEHOLDER ? 1 : 0),
        transition: "fill 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
    },
};
