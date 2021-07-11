import { Button } from "@material-ui/core";
import { ChevronRight } from "@material-ui/icons";
import { clone, reverse } from "lodash";
import React, { useCallback } from "react";
import { VictoryAxis, VictoryBar, VictoryChart, VictoryLine } from "victory";
import { OpenPageCache } from "../../state/app/actions";
import { PageStateType } from "../../state/app/types";
import { useFormatValue } from "../../state/data/hooks";
import { AppColours, Greys, Intents } from "../../styles/colours";
import { formatEmpty } from "../../utilities/data";

export const SeeMore: React.FC<{ page: PageStateType["id"] }> = ({ page }) => (
    <Button endIcon={<ChevronRight />} onClick={OpenPageCache[page]} size="small">
        See More
    </Button>
);

export const useSummaryChart = ({ credits, debits }: { credits: number[]; debits: number[] }, net: number[]) => {
    const format = useFormatValue("0a");
    return useCallback(
        () => (
            <VictoryChart height={200} padding={{ left: 70, right: 10, top: 10, bottom: 10 }} minDomain={{ x: -0.7 }}>
                <VictoryAxis tickFormat={formatEmpty} style={{ axis: { stroke: Greys[600] } }} />
                <VictoryAxis
                    dependentAxis={true}
                    tickFormat={format}
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
                <VictoryLine data={reverse(clone(net))} style={{ data: { stroke: AppColours.summary.main } }} />
            </VictoryChart>
        ),
        [credits, debits, net, format]
    );
};
