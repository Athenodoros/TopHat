import makeStyles from "@mui/styles/makeStyles";
import { orderBy, sumBy } from "lodash";
import React from "react";
import { ChartSign } from "../../../state/app/pageTypes";
import { ID } from "../../../state/shared/values";
import { Greys } from "../../../styles/colours";
import { SummaryChartSign } from "../shared";
import { SummaryPieChart } from "./pie";
import { Value } from "./value";

const useStyles = makeStyles({
    container: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "stretch",
        margin: -5,
        height: 330,
    },
    divider: {
        height: 1,
        margin: "15px 50px 5px 50px",
        backgroundColor: Greys[400],
    },
    points: {
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        justifyContent: "stretch",
        flexShrink: 1,
        flexGrow: 1,
    },
});

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
    data: SummaryBreakdownDatum[];
    setFilter?: (id: ID, sign?: SummaryChartSign) => void;
    colorise?: boolean;
}
export const SummaryBreakdown: React.FC<SummaryBreakdownProps> = ({
    data,
    sign,
    creditsName,
    debitsName,
    setFilter,
    colorise,
    children,
}) => {
    const classes = useStyles();

    const points = orderBy(
        data,
        ({ value }) => (sign !== "debits" ? -value.credit : 0) + (sign !== "credits" ? -value.debit : 0)
    ).filter(({ value, debit }) => {
        if (sign === "credits") return debit === undefined ? value.credit !== 0 : debit === false;
        if (sign === "debits") return debit === undefined ? value.debit !== 0 : debit === true;

        return true;
    });

    return (
        <div className={classes.container}>
            {sign !== "debits" ? (
                <Value
                    name={creditsName}
                    values={[sumBy(data, ({ value }) => value.credit)]}
                    title={true}
                    colorise={colorise}
                />
            ) : undefined}
            {sign !== "credits" ? (
                <Value
                    name={debitsName}
                    values={[sumBy(data, ({ value }) => value.debit)]}
                    title={true}
                    colorise={colorise}
                />
            ) : undefined}
            <div className={classes.divider} />
            <div className={classes.points}>
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
            </div>
            {children || <SummaryPieChart series={points} sign={sign} setFilter={setFilter} />}
        </div>
    );
};
