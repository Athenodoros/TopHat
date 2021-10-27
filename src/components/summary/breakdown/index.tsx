import styled from "@emotion/styled";
import { Box } from "@mui/system";
import { orderBy, sumBy } from "lodash";
import React from "react";
import { ChartSign } from "../../../state/app/pageTypes";
import { ID } from "../../../state/shared/values";
import { Greys } from "../../../styles/colours";
import { SummaryChartSign } from "../shared";
import { SummaryPieChart } from "./pie";
import { Value } from "./value";

export interface SummaryBreakdownDatum {
    id: number;
    name: string;
    colour: string;
    value: {
        credit: number;
        debit: number;
    };
    subtitle?: string;
    subValue?:
        | {
              type: "number";
              symbol: string;
              credit: number;
              debit: number;
          }
        | {
              type: "string";
              credit: string;
              debit: string;
          };
    placeholder?: boolean;
    debit?: boolean;
}
interface SummaryBreakdownProps {
    sign: ChartSign;
    creditsName: string;
    debitsName: string;
    help?: string;
    data: SummaryBreakdownDatum[];
    setFilter?: (id: ID, sign?: SummaryChartSign) => void;
    colorise?: boolean;
}
export const SummaryBreakdown: React.FC<SummaryBreakdownProps> = ({
    data,
    sign,
    creditsName,
    debitsName,
    help,
    setFilter,
    colorise,
    children,
}) => {
    const points = orderBy(data, ({ value }) =>
        sign === "credits" ? -value.credit : sign === "all" ? -value.credit - value.debit : value.debit
    ).filter(({ value, debit }) => {
        if (sign === "credits") return debit === undefined ? value.credit !== 0 : debit === false;
        if (sign === "debits") return debit === undefined ? value.debit !== 0 : debit === true;

        return true;
    });

    return (
        <ContainerBox>
            {sign !== "debits" ? (
                <Value
                    name={creditsName}
                    values={[
                        sumBy(data, ({ debit, value }) =>
                            debit === undefined ? value.credit : debit ? 0 : value.credit
                        ),
                    ]}
                    title={true}
                    help={help}
                    colorise={colorise}
                />
            ) : undefined}
            {sign !== "credits" ? (
                <Value
                    name={debitsName}
                    values={[
                        sumBy(data, ({ debit, value }) =>
                            debit === undefined ? value.debit : debit ? value.debit : 0
                        ),
                    ]}
                    title={true}
                    colorise={colorise}
                    help={help}
                />
            ) : undefined}
            <DividerBox />
            <PointsContainerBox>
                {points.map((p) => (
                    <Value
                        name={p.name}
                        subtitle={p.subtitle}
                        values={
                            {
                                all: [p.value.credit, p.value.debit],
                                credits: [p.value.credit],
                                debits: [p.value.debit],
                            }[sign]
                        }
                        subValues={
                            p.subValue &&
                            (p.subValue.type === "number"
                                ? {
                                      type: "number",
                                      symbol: p.subValue.symbol,
                                      values: {
                                          all: [p.subValue.credit, p.subValue.debit],
                                          credits: [p.subValue.credit],
                                          debits: [p.subValue.debit],
                                      }[sign],
                                  }
                                : {
                                      type: "string",
                                      values: {
                                          all: [p.subValue.credit, p.subValue.debit],
                                          credits: [p.subValue.credit],
                                          debits: [p.subValue.debit],
                                      }[sign],
                                  })
                        }
                        colour={p.colour}
                        placeholder={p.placeholder}
                        key={p.id}
                        onClick={setFilter && (() => setFilter(p.id!))}
                        colorise={colorise}
                    />
                ))}
            </PointsContainerBox>
            {children || <SummaryPieChart series={points} sign={sign} setFilter={setFilter} />}
        </ContainerBox>
    );
};

const ContainerBox = styled(Box)({
    display: "flex",
    flexDirection: "column",
    justifyContent: "stretch",
    margin: -5,
    height: 330,
    flexGrow: 1,
});
const DividerBox = styled(Box)({
    height: 1,
    margin: "7px 50px 5px 50px",
    backgroundColor: Greys[400],
});
const PointsContainerBox = styled(Box)({
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    justifyContent: "stretch",
    flexShrink: 1,
    flexGrow: 1,
});
