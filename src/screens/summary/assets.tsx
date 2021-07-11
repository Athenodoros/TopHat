import { AttachMoney, TrendingUp } from "@material-ui/icons";
import { sum, unzip, values, zip } from "lodash";
import numeral from "numeral";
import React, { useMemo } from "react";
import { FlexWidthChart } from "../../components/display/FlexWidthChart";
import { SummaryNumber } from "../../components/display/SummaryNumber";
import { Section } from "../../components/layout";
import { useAllAccounts, useDefaultCurrency } from "../../state/data/hooks";
import { SeeMore, useSummaryChart } from "./utilities";

export const SummaryAssetsSection = () => {
    const currency = useDefaultCurrency().symbol;

    const accounts = useAllAccounts();
    const { trends, net } = useMemo(() => {
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
        const [credits, debits] = unzip(trends);
        const net = trends.map(sum);
        return { trends: { credits, debits }, net };
    }, [accounts]);

    const getAssetsChart = useSummaryChart(trends, net);

    return (
        <Section title="Net Worth" headers={<SeeMore page="accounts" />}>
            <div>
                <SummaryNumber
                    icon={AttachMoney}
                    primary={{
                        value: `${currency} ${numeral(net[0]).format("0,0.00")}`,
                        positive: net[0] > 0,
                    }}
                    subtext="value today"
                />
                <SummaryNumber
                    icon={TrendingUp}
                    primary={{
                        value: `${currency} ${numeral(net[0] - net[1]).format("+0,0.00")}`,
                        positive: net[0] > net[1],
                    }}
                    secondary={{
                        value: numeral((net[0] - net[1]) / net[1]).format("+0.00%"),
                        positive: net[0] > net[1],
                    }}
                    subtext="in last month"
                />
            </div>
            <FlexWidthChart style={{ flexGrow: 1 }} getChart={getAssetsChart} />
        </Section>
    );
};
