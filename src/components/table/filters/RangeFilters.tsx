import { Slider, SliderProps } from "@mui/material";
import { DateTime } from "luxon";
import React, { useCallback, useMemo } from "react";
import { formatNumber } from "../../../shared/data";
import { useFirstValue } from "../../../shared/hooks";
import { formatDate, getToday, parseDate } from "../../../state/shared/values";

interface DateRangeFilterProps {
    min?: string;
    max?: string;
    from?: string;
    to?: string;
    setRange: (from: string | undefined, to: string | undefined) => void;
}
export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ min, max, from: rawFrom, to: rawTo, setRange }) => {
    const { range, values, onChange } = useMemo(() => {
        const start = min ? parseDate(min) : getToday();
        const getNumericValue = (date: DateTime) => date.diff(start, "days").days;
        const range = Math.floor(getNumericValue(max ? parseDate(max) : getToday()));
        const values = [
            rawFrom ? getNumericValue(parseDate(rawFrom)) : 0,
            rawTo ? getNumericValue(parseDate(rawTo)) : range,
        ];

        const onChange = (_: any, value: [number, number]) => {
            const from = value[0] === 0 ? undefined : formatDate(start.plus({ days: value[0] }));
            const to = value[1] === range ? undefined : formatDate(start.plus({ days: Math.floor(value[1]) }));

            if (from !== rawFrom || to !== rawTo) {
                setRange(from, to);
            }
        };

        return { range, values, onChange };
    }, [max, min, rawFrom, rawTo, setRange]);

    // Defaults shouldn't be changed after the component is initialised.
    const defaults = useFirstValue(values);

    return (
        <Slider max={range} defaultValue={defaults} onChangeCommitted={onChange as SliderProps["onChangeCommitted"]} />
    );
};

interface NumericRangeFilterProps {
    min?: number;
    max?: number;
    from?: number;
    to?: number;
    setRange: (from: number | undefined, to: number | undefined) => void;
}
export const NumericRangeFilter: React.FC<NumericRangeFilterProps> = ({ min, max, from, to, setRange }) => {
    const onChange = useCallback(
        (_: any, values: [number, number]) => {
            const newFrom = values[0] === min ? undefined : values[0];
            const newTo = values[1] === max ? undefined : values[1];

            if (from !== newFrom || to !== newTo) {
                setRange(newFrom, newTo);
            }
        },
        [max, min, from, to, setRange]
    );

    // Defaults shouldn't be changed after the component is initialised.
    const defaults = useFirstValue([from || min || 0, to || max || 0]);

    return (
        <Slider
            min={min || 0}
            max={max || 0}
            defaultValue={defaults}
            onChangeCommitted={onChange as SliderProps["onChangeCommitted"]}
            valueLabelDisplay="auto"
            valueLabelFormat={formatLarge}
        />
    );
};

const formatLarge = (value: number) => formatNumber(value, { end: "k", decimals: 0 });
