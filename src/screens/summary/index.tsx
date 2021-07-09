import { Button, makeStyles } from "@material-ui/core";
import { AttachMoney, ChevronRight, TrendingUp } from "@material-ui/icons";
import { clone, reverse, sum, unzip, values, zip } from "lodash";
import numeral from "numeral";
import React, { useCallback, useMemo } from "react";
import { VictoryAxis, VictoryBar, VictoryChart, VictoryLine } from "victory";
import { SummaryNumber } from "../../components/display/SummaryNumber";
import { Page, Section, SECTION_MARGIN } from "../../components/layout";
import { Notifications } from "../../components/shell/notifications";
import { OpenPageCache } from "../../state/app/actions";
import { PageStateType } from "../../state/app/types";
import { useAllAccounts, useAllCategories, useDefaultCurrency } from "../../state/data/hooks";
import { AppColours, Greys, Intents } from "../../styles/colours";
import { equalZip, formatEmpty } from "../../utilities/data";
import { useDivBoundingRect } from "../../utilities/hooks";

const useStyles = makeStyles({
    container: {
        display: "flex",
    },
    summaryColumn: {
        flexGrow: 1,
        marginRight: SECTION_MARGIN,

        "& > * > *:nth-child(2), & > * > *:nth-child(4)": {
            display: "flex",
        },
    },
    notificationColumn: {
        flexShrink: 0,
        alignSelf: "flex-start",
        width: 350,

        "& > div": {
            padding: 0,
        },
    },
});

export const SummaryPage: React.FC = () => {
    const classes = useStyles();

    const { assets, liabilities, netWorth } = useNetWorthHistory();
    const { credits, debits, netCashflow } = useTransactionHistory();
    const [{ width }, chartRef] = useDivBoundingRect();

    const currency = useDefaultCurrency().symbol;
    const formatNumber = useCallback((x: number) => currency + " " + numeral(x).format("0a"), [currency]);

    return (
        <Page title="Welcome to TopHat!">
            <div className={classes.container}>
                <div className={classes.summaryColumn}>
                    <Section title="Net Worth" headers={<SeeMore page="accounts" />}>
                        <div>
                            <SummaryNumber
                                icon={AttachMoney}
                                primary={{
                                    value: `${currency} ${numeral(netWorth[0]).format("0,0.00")}`,
                                    positive: netWorth[0] > 0,
                                }}
                                subtext="value today"
                            />
                            <SummaryNumber
                                icon={TrendingUp}
                                primary={{
                                    value: `${currency} ${numeral(netWorth[0] - netWorth[1]).format("+0,0.00")}`,
                                    positive: netWorth[0] > netWorth[1],
                                }}
                                secondary={{
                                    value: numeral((netWorth[0] - netWorth[1]) / netWorth[1]).format("+0.00%"),
                                    positive: netWorth[0] > netWorth[1],
                                }}
                                subtext="in last month"
                            />
                        </div>
                        <div ref={chartRef} style={{ flexGrow: 1 }}>
                            <VictoryChart
                                height={200}
                                width={width}
                                padding={{ left: 50, right: 10, top: 10, bottom: 10 }}
                                minDomain={{ x: -0.7 }}
                            >
                                <VictoryAxis tickFormat={formatEmpty} style={{ axis: { stroke: Greys[600] } }} />
                                <VictoryAxis
                                    dependentAxis={true}
                                    tickFormat={formatNumber}
                                    style={{
                                        axis: { stroke: Greys[600] },
                                        tickLabels: { fontSize: 12, fill: Greys[600] },
                                    }}
                                    axisValue={-0.7}
                                    crossAxis={false}
                                />
                                <VictoryBar
                                    data={reverse(clone(assets))}
                                    barRatio={1}
                                    style={{ data: { fill: Intents.success.light, opacity: 0.4 } }}
                                    minDomain={-1}
                                />
                                <VictoryBar
                                    data={reverse(clone(liabilities))}
                                    barRatio={1}
                                    style={{ data: { fill: Intents.danger.light, opacity: 0.4 } }}
                                />
                                <VictoryLine
                                    data={reverse(clone(netWorth))}
                                    style={{ data: { stroke: AppColours.summary.main } }}
                                />
                            </VictoryChart>
                        </div>
                    </Section>
                    <Section title="Cash Flow" headers={<SeeMore page="transactions" />}>
                        <div>
                            <SummaryNumber
                                icon={AttachMoney}
                                primary={{
                                    value: `${currency} ${numeral(
                                        netCashflow[1] + netCashflow[2] + netCashflow[3]
                                    ).format("+0,0.00")}`,
                                    positive: netCashflow[1] + netCashflow[2] + netCashflow[3] > 0,
                                }}
                                subtext="last 3 months"
                            />
                            <SummaryNumber
                                icon={TrendingUp}
                                primary={{
                                    value: `${currency} ${numeral(
                                        netCashflow[1] +
                                            netCashflow[2] +
                                            netCashflow[3] -
                                            netCashflow[4] -
                                            netCashflow[5] -
                                            netCashflow[6]
                                    ).format("+0,0.00")}`,
                                    positive:
                                        netCashflow[1] +
                                            netCashflow[2] +
                                            netCashflow[3] -
                                            netCashflow[4] -
                                            netCashflow[5] -
                                            netCashflow[6] >
                                        0,
                                }}
                                secondary={{
                                    value: numeral(
                                        (netCashflow[1] +
                                            netCashflow[2] +
                                            netCashflow[3] -
                                            netCashflow[4] -
                                            netCashflow[5] -
                                            netCashflow[6]) /
                                            (netCashflow[4] + netCashflow[5] + netCashflow[6])
                                    ).format("+0.00%"),
                                    positive:
                                        netCashflow[1] +
                                            netCashflow[2] +
                                            netCashflow[3] -
                                            netCashflow[4] -
                                            netCashflow[5] -
                                            netCashflow[6] >
                                        0,
                                }}
                                subtext="vs previous 3 months"
                            />
                        </div>
                        <div ref={chartRef} style={{ flexGrow: 1 }}>
                            <VictoryChart
                                height={200}
                                padding={{ left: 50, right: 10, top: 10, bottom: 10 }}
                                minDomain={{ x: -0.7 }}
                                width={width}
                            >
                                <VictoryAxis tickFormat={formatEmpty} style={{ axis: { stroke: Greys[600] } }} />
                                <VictoryAxis
                                    dependentAxis={true}
                                    tickFormat={formatNumber}
                                    style={{
                                        axis: { stroke: Greys[600] },
                                        tickLabels: { fontSize: 12, fill: Greys[600] },
                                    }}
                                    axisValue={-0.7}
                                    crossAxis={false}
                                />
                                <VictoryBar
                                    data={reverse(clone(credits))}
                                    barRatio={1}
                                    style={{ data: { fill: Intents.success.light, opacity: 0.4 } }}
                                    minDomain={-1}
                                />
                                <VictoryBar
                                    data={reverse(clone(debits))}
                                    barRatio={1}
                                    style={{ data: { fill: Intents.danger.light, opacity: 0.4 } }}
                                />
                                <VictoryLine
                                    data={reverse(clone(netCashflow))}
                                    style={{ data: { stroke: AppColours.summary.main } }}
                                />
                            </VictoryChart>
                        </div>
                    </Section>
                </div>
                <Section title="Notifications" className={classes.notificationColumn}>
                    <Notifications />
                </Section>
            </div>
        </Page>
    );
};

const SeeMore: React.FC<{ page: PageStateType["id"] }> = ({ page }) => (
    <Button endIcon={<ChevronRight />} onClick={OpenPageCache[page]} size="small">
        See More
    </Button>
);

const useNetWorthHistory = () => {
    const accounts = useAllAccounts();

    return useMemo(() => {
        const trends = accounts
            .flatMap(({ balances }) => values(balances).map((balance) => balance.localised))
            .reduce(
                (accs, balances) =>
                    zip(accs, balances).map(([acc, bal]) => {
                        const [pos, neg] = acc || ([0, 0] as [number, number]);
                        return (bal && bal > 0 ? [pos + bal, neg] : [pos, neg + (bal || 0)]) as [number, number];
                    }),
                [] as [number, number][]
            );
        const [assets, liabilities] = unzip(trends);
        const netWorth = trends.map(sum);
        return { assets, liabilities, netWorth };
    }, [accounts]);
};

const useTransactionHistory = () => {
    const categories = useAllCategories();

    return useMemo(() => {
        const [credits, debits] = categories
            .flatMap(({ transactions }) => transactions)
            .reduce(
                ([accCredits, accDebits], { credits, debits }) =>
                    [
                        zip(accCredits, credits).map(([acc, val]) => (acc || 0) + (val || 0)),
                        zip(accDebits, debits).map(([acc, val]) => (acc || 0) + (val || 0)),
                    ] as [number[], number[]],
                [[], []] as [number[], number[]]
            );
        const netCashflow = equalZip(credits, debits).map(sum);
        return { credits, debits, netCashflow };
    }, [categories]);
};
