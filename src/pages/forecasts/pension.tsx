import { range } from "lodash";
import numeral from "numeral";
import React, { useMemo } from "react";
import { FlexWidthChart } from "../../components/display/FlexWidthChart";
import { Section } from "../../components/layout";
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

export const ForecastPagePensionCalculator: React.FC = () => {
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
        "Annual growth in savings and withdrawals",
        "% pa.",
        CalculatorEstimates.constant(1.5)
    );
    const horizon = useCalculatorInputDisplay(
        "Horizon",
        "Years before retirement date",
        "yrs",
        CalculatorEstimates.constant(30)
    );
    const length = useCalculatorInputDisplay(
        "Length",
        "Length of retirement in years",
        "yrs",
        CalculatorEstimates.constant(0),
        "Indefinite"
    );

    const nominalValueToggle = useNominalValueToggle();

    const results = useSimulationResults(
        netWorth.value,
        interest.value,
        savings.value,
        length.value,
        horizon.value,
        inflation.value,
        currency.symbol,
        nominalValueToggle.value
    );

    return (
        <CalculatorContainer>
            <Section title="Retirement Income">
                <CalculatorInputGrid>
                    {netWorth.input}
                    {interest.input}
                    {savings.input}
                    {inflation.input}
                    {horizon.input}
                    {length.input}
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
    retirementLength: number,
    horizon: number,
    inflation: number,
    symbol: string,
    showNominalValues: boolean
) =>
    useMemo(() => {
        const months = horizon * 12 + (retirementLength ? Math.min(retirementLength * 12, 100 * 12 + 1) : 100 * 12 + 1);

        let balances = [netWorth];
        let expenses = 0;
        for (let month of range(months)) {
            if (month === horizon * 12) {
                // See also: https://en.wikipedia.org/wiki/Mortgage_calculator#Monthly_payment_formula
                const principal = balances[0];
                const rate = (1 + interest / 12 / 100) / (1 + inflation / 12 / 100);

                let nominalExpenses: number;
                if (!retirementLength) nominalExpenses = ((interest - inflation) / 12 / 100) * principal;
                else if (interest === 0) nominalExpenses = principal / (retirementLength * 12 - 1);
                else nominalExpenses = ((rate - 1) * principal) / (1 - Math.pow(rate, -(retirementLength * 12 - 1)));

                expenses = nominalExpenses / Math.pow(1 + inflation / 12 / 100, month);
            }

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

        const chart = getCalculatorBalanceDisplayChart(balances, symbol, horizon);

        return {
            results: (
                <>
                    <CalculatorResultDisplay
                        title="Value at Retirement"
                        intent={retirement > 0 ? "primary" : "danger"}
                        value={
                            symbol + " " + numeral(retirement || 0).format(retirement > 1000000 ? "0.00a" : "0,0.00")
                        }
                    />
                    <CalculatorResultDisplay
                        title="Monthly Income"
                        intent={retirement > 0 ? "primary" : "danger"}
                        value={
                            symbol +
                            " " +
                            numeral(
                                expenses * (showNominalValues ? Math.pow(1 + inflation / 12 / 100, horizon * 12) : 1)
                            ).format(retirement > 1000000 ? "0.00a" : "0,0.00")
                        }
                    />
                </>
            ),
            getChart: () => chart,
        };
    }, [netWorth, interest, savings, retirementLength, horizon, inflation, symbol, showNominalValues]);
