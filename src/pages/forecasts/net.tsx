import { last, range } from "lodash";
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
    CalculatorTickLengthCandidates,
    getCalculatorBalanceDisplayChart,
    useCalculatorInputDisplay,
} from "./display";

export const ForecastPageNetWorthCalculator: React.FC = () => {
    const currency = useDefaultCurrency();

    const savings = useCalculatorInputDisplay(
        "Net Worth",
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
    const income = useCalculatorInputDisplay(
        "Income",
        "Monthly income at start of simulation",
        currency.symbol,
        CalculatorEstimates.income
    );
    const expenses = useCalculatorInputDisplay(
        "Expenses",
        "Monthly expenses at start of simulation",
        currency.symbol,
        CalculatorEstimates.expenses
    );
    const length = useCalculatorInputDisplay(
        "Length",
        "Length of simulation in years",
        "yrs",
        CalculatorEstimates.constant(20)
    );
    const inflation = useCalculatorInputDisplay(
        "Inflation",
        "Annual rate of inflation",
        "% pa.",
        CalculatorEstimates.constant(1.5)
    );

    const results = useSimulationResults(
        savings.value,
        interest.value,
        income.value,
        expenses.value,
        length.value,
        inflation.value,
        currency.symbol
    );

    return (
        <CalculatorContainer>
            <Section title="Net Worth">
                <CalculatorInputGrid>
                    {savings.input}
                    {interest.input}
                    {income.input}
                    {expenses.input}
                    {length.input}
                    {inflation.input}
                </CalculatorInputGrid>
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
    savings: number,
    interest: number,
    income: number,
    expenses: number,
    years: number,
    inflation: number,
    symbol: string
) =>
    useMemo(() => {
        let balances = [savings];
        for (let month of range(years * 12 + 1)) {
            const balance = balances[0] * (1 + interest / 12 / 100);
            const credit = income * Math.pow(1 + inflation / 12 / 100, month);
            const debit = expenses * Math.pow(1 + inflation / 12 / 100, month);

            balances.unshift(balance + credit - debit);
        }
        balances.reverse();

        const getRawCheckinDisplay = (month: number) => getCheckinDisplay(month, balances[month + 1]);
        const getCheckinDisplay = (month: number, value: number) => {
            const colour =
                savings > 0
                    ? value > savings
                        ? "success"
                        : value < 0
                        ? "danger"
                        : "warning"
                    : value > savings
                    ? "primary"
                    : "danger";

            const title =
                "Value in " +
                (month >= 12
                    ? Math.round((month / 12) * 10) / 10 + " year" + (month > 12 ? "s" : "")
                    : month + " month" + (month !== 1 ? "s" : ""));

            return (
                <CalculatorResultDisplay
                    title={title}
                    intent={colour}
                    value={symbol + " " + numeral(value || 0).format(value > 1000000 ? "0.00a" : "0,0.00")}
                />
            );
        };

        const chart = getCalculatorBalanceDisplayChart(balances, symbol);

        let halfway = CalculatorTickLengthCandidates.findIndex((x) => x > years * 12) - 2;
        if (halfway < 0)
            halfway =
                CalculatorTickLengthCandidates.length -
                (last(CalculatorTickLengthCandidates)! * 2 > years * 12 ? 2 : 1);

        return {
            results: (
                <>
                    {getRawCheckinDisplay(CalculatorTickLengthCandidates[halfway])}
                    {getRawCheckinDisplay(years * 12)}
                </>
            ),
            getChart: () => chart,
        };
    }, [savings, interest, income, expenses, years, inflation, symbol]);
