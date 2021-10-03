import { Typography } from "@mui/material";
import { dropRightWhile, identity, mapValues, max, mean, min, range, sum, sumBy, unzip, values } from "lodash";
import numeral from "numeral";
import React, { useMemo } from "react";
import { VictoryAxis, VictoryChart, VictoryLine, VictoryTheme } from "victory";
import { FlexWidthChart } from "../../components/display/FlexWidthChart";
import { getChartPerformanceProps } from "../../components/display/PerformantCharts";
import { Section } from "../../components/layout";
import { TopHatStore } from "../../state";
import { Account, getDateBucket } from "../../state/data";
import { useDefaultCurrency } from "../../state/data/hooks";
import { formatDate, getToday } from "../../state/shared/values";
import { Intents } from "../../styles/colours";
import {
    CalculatorContainer,
    CalculatorInputDivider,
    CalculatorInputGrid,
    CalculatorInputSection,
    CalculatorResultDisplay,
    useCalculatorInputDisplay,
} from "./shared";

export const ForecastPageDebtCalculator: React.FC = () => {
    const currency = useDefaultCurrency();

    const debt = useCalculatorInputDisplay("Base", "Starting level of debt", currency.symbol, getDebtEstimate);
    const interest = useCalculatorInputDisplay(
        "Interest",
        "Growth rate - usually an average interest rate",
        "% pa.",
        getInterestEstimate
    );
    const repayments = useCalculatorInputDisplay(
        "Repayments",
        "Monthly repayments",
        currency.symbol,
        getRepaymentEstimate
    );
    const growth = useCalculatorInputDisplay(
        "Growth",
        "Annual growth rate of monthly repayments",
        "% pa.",
        getIncreaseEstimate
    );

    const results = useSimulationResults(debt.value, interest.value, repayments.value, growth.value, currency.symbol);

    return (
        <CalculatorContainer>
            <CalculatorInputSection title="Debt">
                <CalculatorInputGrid>
                    {debt.input}
                    {interest.input}
                    {repayments.input}
                    {growth.input}
                </CalculatorInputGrid>
                <CalculatorInputDivider />
                <CalculatorInputGrid>{results.results}</CalculatorInputGrid>
            </CalculatorInputSection>
            <Section title=" ">
                <FlexWidthChart getChart={results.getChart} />
            </Section>
        </CalculatorContainer>
    );
};

// Perform simulation and render chart
const useSimulationResults = (debt: number, interest: number, repayments: number, growth: number, symbol: string) =>
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

        const length = Math.round((balances.length / 12) * 10) / 10;

        const getCheckinDisplay = (year: number) => {
            const value: number | undefined = balances[12 * year + 1];
            return (
                <CalculatorResultDisplay title={`Debt in ${year} year${year > 1 ? "s" : ""}`}>
                    <Typography
                        variant="h6"
                        color={Intents[!value ? "success" : value > debt ? "danger" : "primary"].main}
                    >
                        {symbol}{" "}
                        {value !== undefined || result !== "infinite"
                            ? numeral(value || 0).format("0,0.00")
                            : "Infinity"}
                    </Typography>
                </CalculatorResultDisplay>
            );
        };

        const getTicks = (step: number) => range(step, balances.length, step);

        let tickLengthCandidates = [1, 2, 4, 6, 12, 24, 60, 120];
        let tickValues = getTicks(tickLengthCandidates.find((i) => balances.length - 1 < i * 6) || 240);

        const chart = (
            <VictoryChart
                height={330}
                padding={{ left: 90, right: 10, top: 10, bottom: 30 }}
                {...getChartPerformanceProps({
                    x: [-1, balances.length],
                    y: [(min(balances) || 0) * 1.02, (max(balances) || 0) * 1.02],
                })}
                theme={VictoryTheme.material}
            >
                <VictoryAxis
                    dependentAxis={true}
                    tickValues={[balances[0]]}
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
                <VictoryLine
                    data={balances.map((y, x) => ({ x, y }))}
                    style={{
                        data: {
                            stroke: Intents.primary.main,
                            strokeWidth: 2,
                            // fill: fadeSolidColour(Intents.primary.light),
                        },
                    }}
                />
            </VictoryChart>
        );

        return {
            results: (
                <>
                    {getCheckinDisplay(1)}
                    {getCheckinDisplay(5)}
                    <CalculatorResultDisplay title="Time to zero debt">
                        <Typography
                            variant="h6"
                            color={
                                Intents[
                                    result === "success" ? "primary" : result === "indeterminate" ? "warning" : "danger"
                                ].main
                            }
                        >
                            {result === "success"
                                ? length + " Years"
                                : result === "indeterminate"
                                ? `>${years} Years`
                                : "Infinity"}
                        </Typography>
                    </CalculatorResultDisplay>
                </>
            ),
            getChart: () => chart,
        };
    }, [debt, interest, repayments, growth, symbol]);

// Estimate simulation inputs
const getAccountBalances = (account: Account) =>
    unzip(values(account.balances).map((balance) => balance.localised)).map((values) => sum(values.filter(identity)));
const getAccountBalance = (account: Account) => getAccountBalances(account)[0];
const getDataState = () => TopHatStore.getState().data;
const getAccounts = () => {
    const { account } = getDataState();
    return account.ids.map((id) => account.entities[id]!);
};

const getDebtEstimate = () => {
    const debtAccounts = getAccounts().filter((account) => getAccountBalance(account) < 0);
    return -sumBy(debtAccounts, getAccountBalance);
};

const getInterestEstimate = () => {
    // Estimate negative interest by looking at negative transactions in debt accounts in the previous 12 months
    // This works reasonably well for a cost-averaged rate on large loans (eg. mortgages)
    // When the transactions might actually be payments (eg. an overdrawn transaction account) this
    //     doesn't estimate the actual interest rate, but still produces a reasonable number for calculations
    let debtIncreasingTransactionTotal = 0;
    let negativeBalanceTotals = 0;
    getAccounts().forEach((account) => {
        const balances = getAccountBalances(account);
        const { debits } = account.transactions;

        range(1, 13).forEach((i) => {
            if (balances[i] < 0 && debits[i] !== undefined) {
                debtIncreasingTransactionTotal += debits[i];
                negativeBalanceTotals += balances[i];
            }
        });
    });
    return negativeBalanceTotals ? (debtIncreasingTransactionTotal / (negativeBalanceTotals / 12)) * 100 : 3;
};

const getRepaymentEstimate = () => {
    const repayments = range(12).map((_) => 0);
    const previous = formatDate(getToday().startOf("month").minus({ months: 1 }));

    const accounts = mapValues(getDataState().account.entities, (account) => getAccountBalances(account!));

    const transactions = getDataState().transaction.entities;
    for (let id of getDataState().transaction.ids) {
        const tx = transactions[id]!;
        const bucket = getDateBucket(tx.date, previous);
        if (bucket < 0) continue;
        if (bucket > 11) break;

        if (tx.value! > 0 && accounts[tx.account][bucket] < 0) {
            repayments[bucket] += tx.value!;
        }
    }

    return mean(dropRightWhile(repayments, (x) => !x));
};

// This could be estimated, but I think not with any reasonable accuracy
const getIncreaseEstimate = () => 0;
