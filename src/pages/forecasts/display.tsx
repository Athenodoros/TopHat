import styled from "@emotion/styled";
import { HelpOutlined } from "@mui/icons-material";
import { FormControlLabel, Grid, Switch, TextField, Tooltip, Typography } from "@mui/material";
import { Box } from "@mui/system";
import { max, min, range } from "lodash";
import numeral from "numeral";
import React, { useCallback, useMemo, useState } from "react";
import { VictoryAxis, VictoryChart, VictoryLine, VictoryTheme, VictoryTooltip, VictoryVoronoiContainer } from "victory";
import { getChartPerformanceProps } from "../../components/display/PerformantCharts";
import { SECTION_MARGIN } from "../../components/layout";
import { useNumericInputHandler } from "../../shared/hooks";
import { Greys, Intents } from "../../styles/colours";

export const CalculatorContainer = styled(Box)({
    display: "flex",
    "& > div:first-of-type": { width: 400, marginRight: SECTION_MARGIN },
    "& > div:last-of-type": { flexGrow: 1 },
});

export const CalculatorInputGrid: React.FC = ({ children }) => (
    <Grid container={true} spacing={3}>
        {children}
    </Grid>
);

export const useCalculatorInputDisplay = (
    title: string,
    help: string,
    measure: string,
    estimate: () => number,
    placeholder?: string
) => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const defaultValue = useMemo(() => Math.round(estimate() * 100) / 100, []);

    const [value, setValue] = useState<number | null>(null);
    const handler = useNumericInputHandler(value, setValue);

    return {
        value: value ?? defaultValue,
        input: (
            <Grid
                item={true}
                xs={6}
                sx={{
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", marginBottom: 4 / 8 }}>
                    <Typography
                        variant="subtitle2"
                        sx={{ textTransform: "uppercase", color: Greys[700], marginRight: 8 / 8 }}
                    >
                        {title}
                    </Typography>
                    <Typography variant="caption" sx={{ textTransform: "uppercase", color: Greys[600], flexGrow: 1 }}>
                        ({measure})
                    </Typography>
                    <Tooltip title={help}>
                        <HelpOutlined sx={{ fontSize: 16, marginLeft: 10 / 8 }} htmlColor={Greys[400]} />
                    </Tooltip>
                </Box>
                <TextField
                    size="small"
                    placeholder={placeholder || "" + defaultValue}
                    sx={{ width: "100%" }}
                    value={handler.text}
                    onChange={handler.onTextChange}
                />
            </Grid>
        ),
    };
};

export const CalculatorInputDivider = styled(Box)({
    borderTop: "1px solid " + Greys[300],
    margin: "24px 55px 32px 55px",
});

export const CalculatorResultDisplay: React.FC<{ title: string; intent?: keyof typeof Intents; value: string }> = ({
    title,
    intent,
    value,
}) => (
    <Grid item={true} xs={6} sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        <Typography variant="caption" color={Greys[600]} sx={{ textTransform: "uppercase", lineHeight: 1 }}>
            {title}
        </Typography>
        <Typography variant="h6" color={intent ? Intents[intent].main : Greys[600]} noWrap={true}>
            {value}
        </Typography>
    </Grid>
);

export const useNominalValueToggle = (disabled?: boolean) => {
    const [showNominalValues, setShowNominalValues] = useState(true);
    const toggleShowNominalValues = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => setShowNominalValues(event.target.checked),
        []
    );
    const node = (
        <Box sx={{ display: "flex", justifyContent: "flex-end", margin: "8px 8px -20px 0", color: Greys[600] }}>
            <FormControlLabel
                control={<Switch size="small" checked={showNominalValues} onChange={toggleShowNominalValues} />}
                label={
                    <Typography variant="caption">
                        {showNominalValues ? "Show Nominal Values" : "Show Real Values"}
                    </Typography>
                }
                labelPlacement="start"
                disabled={disabled}
            />
        </Box>
    );

    return { value: showNominalValues, node };
};

export const CalculatorTickLengthCandidates = [1, 2, 4, 6, 12, 24, 60, 120, 240, 600];
export const getCalculatorBalanceDisplayChart = (balances: number[], symbol: string, horizon?: number) => {
    const getTicks = (step: number) => range(step, balances.length, step);
    const tickValues = getTicks(CalculatorTickLengthCandidates.find((i) => balances.length - 1 < i * 6) || 240);

    return (
        <VictoryChart
            height={355}
            padding={{ left: 90, right: 30, top: 10, bottom: 30 }}
            {...getChartPerformanceProps({
                x: [-1, balances.length],
                y: [Math.min((min(balances) || 0) * 1.02, 0), Math.max((max(balances) || 0) * 1.02, 0)],
            })}
            theme={VictoryTheme.material}
            containerComponent={
                <VictoryVoronoiContainer
                    voronoiDimension="x"
                    labels={({ datum }) =>
                        `${Math.round((datum.x / 12) * 10) / 10} Years: ${symbol} ${numeral(datum.y).format("0.0a")}`
                    }
                    labelComponent={<VictoryTooltip flyoutStyle={{ fill: "white" }} />}
                    voronoiBlacklist={["horizon"]}
                />
            }
        >
            <VictoryAxis
                dependentAxis={true}
                tickFormat={(value: number) => symbol + " " + numeral(value).format("0.0a")}
            />
            <VictoryAxis
                tickValues={tickValues}
                tickFormat={
                    balances.length > 36
                        ? (month: number) => Math.round(month / 12) + " Years"
                        : (month: number) => month + " Months"
                }
                orientation="bottom"
            />
            {horizon ? <VictoryLine name="horizon" x={() => horizon * 12} /> : undefined}
            <VictoryLine
                data={balances.map((y, x) => ({ x, y }))}
                style={{
                    data: {
                        stroke: Intents.primary.main,
                        strokeWidth: 2,
                    },
                }}
            />
        </VictoryChart>
    );
};
