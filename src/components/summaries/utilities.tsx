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
) => [
    {
        childName: "all",
        target: "data" as const,
        eventHandlers: {
            onMouseEnter: () => ({
                eventKey: highlightSeries ? "all" : undefined,
                mutation: (event: ChartPointEvent) =>
                    event && {
                        style: Object.assign({}, event.style, {
                            stroke: event.datum.id !== EMPTY_ID_PLACEHOLDER ? "black" : undefined,
                            strokeWidth: 2,
                            transition: "none",
                        }),
                    },
            }),
            onMouseOut: () => ({ eventKey: highlightSeries ? "all" : undefined, mutation: () => null }),
            onClick: (event: React.SyntheticEvent) => {
                event.preventDefault();
                event.stopPropagation();

                return {
                    mutation: (event: T) => {
                        onClick(event);
                        return {
                            style: Object.assign({}, event.style, {
                                stroke: event.datum.id !== EMPTY_ID_PLACEHOLDER ? "black" : undefined,
                                strokeWidth: 2,
                                transition: "none",
                            }),
                        };
                    },
                };
            },
        },
    },
];
export const CHART_SECTION_STYLE: VictoryStyleInterface = {
    data: {
        cursor: ({ datum }) => (datum.id !== EMPTY_ID_PLACEHOLDER ? "pointer" : "inherit"),
        fill: ({ datum }) => datum.colour,
        transition: "stroke 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
    },
};
