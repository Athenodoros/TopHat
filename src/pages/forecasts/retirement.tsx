import { last, range } from "lodash";
import React, { useMemo } from "react";
import { FlexWidthChart } from "../../components/display/FlexWidthChart";
import { Section } from "../../components/layout";
import { formatNumber } from "../../shared/data";
import { useDefaultCurrency } from "../../state/data/hooks";
import { CalculatorEstimates } from "./data";
import {
    CalculatorContainer,
    CalculatorInputDivider,
    CalculatorInputGrid,
    CalculatorResultDisplay,
    getCalculatorBalanceDisplayChart,
    useCalculatorInputDisplay,
    useNominalValueToggle,
} from "./display";

export const ForecastPageRetirementCalculator: React.FC = () => {
    const currency = useDefaultCurrency();

    const netWorth = useCalculatorInputDisplay(
        "Start Value",
        "Net worth at start of simulation",
        currency.symbol,
        CalculatorEstimates.netWorth
    );
    const interest = useCalculatorInputDisplay(
        "Interest",
        "Interest rate on assets and liabilities",
        "% pa.",
        CalculatorEstimates.constant(4)
    );
    const savings = useCalculatorInputDisplay(
        "Savings",
        "Monthly savings prior to retirement in today's values",
        currency.symbol,
        CalculatorEstimates.savings
    );
    const inflation = useCalculatorInputDisplay(
        "Inflation",
        "Annual rate of inflation",
        "% pa.",
        CalculatorEstimates.constant(1.5)
    );
    const horizon = useCalculatorInputDisplay(
        "Horizon",
        "Years before retirement date",
        "yrs",
        CalculatorEstimates.constant(30)
    );
    const expenses = useCalculatorInputDisplay(
        "Expenses",
        "Monthly expenses during retirement in today's values",
        currency.symbol,
        CalculatorEstimates.expenses
    );

    const nominalValueToggle = useNominalValueToggle();

    const results = useSimulationResults(
        netWorth.value,
        interest.value,
        savings.value,
        expenses.value,
        horizon.value,
        inflation.value,
        currency.symbol,
        nominalValueToggle.value
    );

    return (
        <CalculatorContainer>
            <Section title="Retirement Length">
                <CalculatorInputGrid>
                    {netWorth.input}
                    {interest.input}
                    {savings.input}
                    {inflation.input}
                    {horizon.input}
                    {expenses.input}
                </CalculatorInputGrid>
                {nominalValueToggle.node}
                <CalculatorInputDivider />
                <CalculatorInputGrid>{results.results}</CalculatorInputGrid>
            </Section>
            <Section title=" ">
                <FlexWidthChart getChart={results.getChart} sx={{ "& svg": { overflow: "visible" } }} />
            </Section>
        </CalculatorContainer>
    );
};

const useSimulationResults = (
    netWorth: number,
    interest: number,
    savings: number,
    expenses: number,
    horizon: number,
    inflation: number,
    symbol: string,
    showNominalValues: boolean
) =>
    useMemo(() => {
        const years = horizon + 100;

        let balances = [netWorth];
        for (let month of range(years * 12)) {
            const balance = balances[0] * (1 + interest / 12 / 100);
            const credit = month < horizon * 12 ? savings * Math.pow(1 + inflation / 12 / 100, month) : 0;
            const debit = month < horizon * 12 ? 0 : expenses * Math.pow(1 + inflation / 12 / 100, month);

            if (balance + credit < debit) {
                balances.unshift(0);
                break;
            }

            balances.unshift(balance + credit - debit);
        }
        balances.reverse();

        if (!showNominalValues)
            balances.forEach((_, idx) => (balances[idx] /= Math.pow(1 + inflation / 12 / 100, idx)));

        const retirement = balances[horizon * 12];
        const length = balances.length - 1 - horizon * 12;

        const chart = getCalculatorBalanceDisplayChart(balances, symbol, horizon);

        return {
            results: (
                <>
                    <CalculatorResultDisplay
                        title="Value at Retirement"
                        intent={retirement > 0 ? "primary" : "danger"}
                        value={
                            symbol +
                            " " +
                            formatNumber(retirement || 0, retirement > 1000000 ? { end: "k" } : undefined)
                        }
                    />
                    {(retirement || 0) <= 0 ? (
                        <CalculatorResultDisplay title="Length of Retirement" value="N/A" />
                    ) : last(balances)! > 0.0001 ? (
                        <CalculatorResultDisplay title="Length of Retirement" intent="success" value=">100 Years" />
                    ) : (
                        <CalculatorResultDisplay
                            title="Length of Retirement"
                            intent="primary"
                            value={
                                length >= 12
                                    ? Math.round((length / 12) * 10) / 10 + " year" + (length > 12 ? "s" : "")
                                    : length + " month" + (length !== 1 ? "s" : "")
                            }
                        />
                    )}
                </>
            ),
            getChart: () => chart,
        };
    }, [netWorth, interest, savings, expenses, horizon, inflation, symbol, showNominalValues]);
