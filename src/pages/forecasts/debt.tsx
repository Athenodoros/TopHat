import { dropRightWhile, range } from "lodash";
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

export const ForecastPageDebtCalculator: React.FC = () => {
    const currency = useDefaultCurrency();

    const debt = useCalculatorInputDisplay("Base", "Starting level of debt", currency.symbol, CalculatorEstimates.debt);
    const interest = useCalculatorInputDisplay(
        "Interest",
        "Growth rate - usually an average interest rate",
        "% pa.",
        CalculatorEstimates.interest
    );
    const repayments = useCalculatorInputDisplay(
        "Repayments",
        "Monthly repayments",
        currency.symbol,
        CalculatorEstimates.repayments
    );
    const growth = useCalculatorInputDisplay(
        "Inflation",
        "Annual growth rate of monthly repayments",
        "% pa.",
        CalculatorEstimates.constant(0)
    );

    const nominalValueToggle = useNominalValueToggle(growth.value === 0);

    const results = useSimulationResults(
        debt.value,
        interest.value,
        repayments.value,
        growth.value,
        currency.symbol,
        nominalValueToggle.value
    );

    return (
        <CalculatorContainer>
            <Section title="Debt">
                <CalculatorInputGrid>
                    {debt.input}
                    {interest.input}
                    {repayments.input}
                    {growth.input}
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

// Perform simulation and render chart
const useSimulationResults = (
    debt: number,
    interest: number,
    repayments: number,
    growth: number,
    symbol: string,
    showNominalValues: boolean
) =>
    useMemo(() => {
        const years = 100;

        let balances = [debt];
        let result: "indeterminate" | "success" | "infinite" = "indeterminate";
        for (let month of range(years * 12)) {
            const balance = balances[0] * (1 + interest / 12 / 100);
            const payment = repayments * Math.pow(1 + growth / 12 / 100, month);

            if (payment >= balance) {
                balances.unshift(0);
                result = "success";
                break;
            }
            if (isNaN(balance)) {
                result = "infinite";
                break;
            }

            balances.unshift(balance - payment);
        }
        balances.reverse();

        if (!showNominalValues) balances.forEach((_, idx) => (balances[idx] /= Math.pow(1 + growth / 12 / 100, idx)));

        const getCheckinDisplay = (year: number) => {
            const value: number | undefined = balances[12 * year + 1];
            return (
                <CalculatorResultDisplay
                    title={`Debt in ${year} year${year > 1 ? "s" : ""}`}
                    intent={!value ? "success" : value > debt ? "danger" : "primary"}
                    value={
                        symbol +
                        " " +
                        (value !== undefined || result !== "infinite"
                            ? numeral(value || 0).format(value > 1000000 ? "0.00a" : "0,0.00")
                            : "Infinity")
                    }
                />
            );
        };

        const chart = getCalculatorBalanceDisplayChart(balances, symbol);

        return {
            results: (
                <>
                    {getCheckinDisplay(1)}
                    {getCheckinDisplay(5)}
                    <CalculatorResultDisplay
                        title="Time to zero debt"
                        intent={result === "success" ? "primary" : result === "indeterminate" ? "warning" : "danger"}
                        value={
                            result === "success"
                                ? Math.round((dropRightWhile(balances, (x) => !x).length / 12) * 10) / 10 + " Years"
                                : result === "indeterminate"
                                ? `>${years} Years`
                                : "Infinity"
                        }
                    />
                </>
            ),
            getChart: () => chart,
        };
    }, [debt, interest, repayments, growth, symbol, showNominalValues]);
