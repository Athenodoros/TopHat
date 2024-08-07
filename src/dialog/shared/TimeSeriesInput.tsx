import { VerticalAlignCenter } from "@mui/icons-material";
import { Box, Button, TextField, textFieldClasses } from "@mui/material";
import { noop } from "lodash";
import React, { useCallback, useState } from "react";
import { BasicBarChart } from "../../components/display/BasicBarChart";
import { useNumericInputHandler } from "../../shared/hooks";

interface TimeSeriesInputProps {
    values: number[];
    getOriginals: () => number[] | undefined;
    pullForward?: () => void;
    update: (index: number, value: number | null) => void;
    secondary?: {
        label: string;
        value: number | null;
        update: (value: number | null) => void;
        disabled?: boolean;
        getOriginal: () => number | undefined;
    };
    getMouseOverText?: (value: number) => string;
    inputs?: React.ReactNode;
    id?: any;
}

export const useTimeSeriesInput = ({
    values,
    update,
    pullForward,
    secondary,
    id,
    getMouseOverText,
    getOriginals,
    inputs,
}: TimeSeriesInputProps) => {
    const [selectedMonth, setSelectedMonthRaw] = useState(0);

    const month = useNumericInputHandler(values[selectedMonth] ?? null, (value) => update(selectedMonth, value), id);
    const base = useNumericInputHandler(secondary?.value ?? null, secondary?.update ?? noop, id);

    const setSelectedMonth = useCallback(
        (value: number) => {
            setSelectedMonthRaw(value);
            month.setValue(values[value] ?? null);
        },
        [month, values]
    );

    // These dummies are to help ESLint work out the dependencies of the callback
    const setMonthValue = month.setValue;
    const setBaseValue = base.setValue;
    const getOriginalBase = secondary?.getOriginal;
    const onReset = useCallback(() => {
        setMonthValue((getOriginals() || [])[selectedMonth] ?? null);
        setBaseValue((getOriginalBase && getOriginalBase()) ?? null);
    }, [setMonthValue, setBaseValue, selectedMonth, getOriginals, getOriginalBase]);
    const setValues = useCallback(
        (value: number) => {
            setMonthValue(value);
            setBaseValue(value);
        },
        [setBaseValue, setMonthValue]
    );

    return {
        component: (
            <Box
                sx={{
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <BasicBarChart
                    sx={{
                        height: 30,
                        marginBottom: 15,
                    }}
                    getMouseOverText={getMouseOverText}
                    values={values}
                    selected={inputs ? undefined : selectedMonth}
                    setSelected={inputs ? undefined : setSelectedMonth}
                />
                {inputs || (
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            ["& > ." + textFieldClasses.root]: { width: 160 },
                        }}
                    >
                        <TextField
                            value={month.text}
                            onChange={month.onTextChange}
                            size="small"
                            label="Selected Month"
                        />
                        {secondary ? (
                            <TextField
                                value={base.text}
                                onChange={base.onTextChange}
                                size="small"
                                label={secondary.label}
                                disabled={secondary.disabled}
                            />
                        ) : pullForward ? (
                            <Button
                                variant="outlined"
                                startIcon={<VerticalAlignCenter fontSize="small" />}
                                onClick={pullForward}
                            >
                                Flatten
                            </Button>
                        ) : undefined}
                    </Box>
                )}
            </Box>
        ),
        onReset,
        setValues,
    };
};
