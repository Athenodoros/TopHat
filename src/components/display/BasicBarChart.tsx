import { lighten, useTheme } from "@material-ui/core";
import React from "react";
import { Greys, Intents } from "../../styles/colours";

export const BasicBarChart: React.FC<{
    className?: string;
    values: number[];
    selected: number;
    setSelected: (index: number) => void;
}> = ({ className, values, selected: selectedIndex, setSelected }) => {
    const theme = useTheme();

    const min = Math.min(0, ...values);
    let max = Math.max(0, ...values);
    let stub = false;

    if (min === 0 && max === 0) {
        max = 0.1;
        stub = true;
    }

    const range = max - min;

    const mixed = min < 0 && max > 0;

    const width = (1 / values.length) * 100 + "%";

    return (
        <div className={className} style={{ position: "relative" }}>
            {values.map((val, idx) => {
                const colour = stub
                    ? { main: Greys[700], dark: Greys[700] }
                    : Intents[mixed ? (val > 0 ? "success" : "danger") : "primary"];
                const selected = selectedIndex === idx;
                const right = (idx / values.length) * 100 + "%";

                return (
                    <React.Fragment key={idx}>
                        <div
                            style={{
                                position: "absolute",
                                cursor: "pointer",
                                right,
                                width,
                                height: "100%",
                                background: selected ? Greys[300] : undefined,
                            }}
                            onClick={() => setSelected(idx)}
                        />
                        <div
                            style={{
                                position: "absolute",
                                pointerEvents: "none",
                                right,
                                top:
                                    ((mixed ? max - Math.max(0, val) : (max || -min) - Math.abs(val)) / range) * 100 +
                                    "%",
                                height: (Math.abs(val) / range) * 100 + "%",
                                width,
                                background: lighten(colour.main, selected ? 0.1 : 0.4),
                                [!mixed || val > 0 ? "borderTop" : "borderBottom"]:
                                    "2px solid " + colour[selected ? "dark" : "main"],
                                transition: theme.transitions.create("all"),
                            }}
                        />
                    </React.Fragment>
                );
            })}
        </div>
    );
};
