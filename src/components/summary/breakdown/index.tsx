import { makeStyles } from "@material-ui/core";
import { orderBy, sumBy } from "lodash";
import React from "react";
import { ChartSign } from "../../../state/app/types";
import { ID } from "../../../state/utilities/values";
import { Greys } from "../../../styles/colours";
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
        overflowY: "scroll",
        display: "flex",
        flexDirection: "column",
        justifyContent: "stretch",
        flexShrink: 1,
        flexGrow: 1,
    },
});

interface SummaryBreakdownDatum {
    id: number;
    name: string;
    colour: string;
    value: {
        credit: number;
        debit: number;
    };
    subtitle?: string;
    subValue?: {
        symbol: string;
        credit: number;
        debit: number;
    };
    placeholder?: boolean;
}
interface SummaryBreakdownProps {
    sign: ChartSign;
    creditsName: string;
    debitsName: string;
    data: SummaryBreakdownDatum[];
    setFilter: (id: ID) => void;
}
export const SummaryBreakdown: React.FC<SummaryBreakdownProps> = ({
    data,
    sign,
    creditsName,
    debitsName,
    setFilter,
}) => {
    const classes = useStyles();

    const points = orderBy(
        data,
        ({ value }) => (sign !== "debits" ? -value.credit : 0) + (sign !== "credits" ? value.debit : 0)
    ).filter(({ value }) => (sign !== "debits" && value.credit) || (sign !== "credits" && value.debit));

    return (
        <div className={classes.container}>
            {sign !== "debits" ? (
                <Value name={creditsName} values={[sumBy(data, ({ value }) => value.credit)]} title={true} />
            ) : undefined}
            {sign !== "credits" ? (
                <Value name={debitsName} values={[sumBy(data, ({ value }) => value.debit)]} title={true} />
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
                            p.subValue && {
                                symbol: p.subValue.symbol,
                                values: {
                                    all: [p.subValue.credit, p.subValue.debit],
                                    credits: [p.subValue.credit],
                                    debits: [p.subValue.debit],
                                }[sign],
                            }
                        }
                        colour={p.colour}
                        placeholder={p.placeholder}
                        key={p.id}
                        onClick={() => setFilter(p.id!)}
                    />
                ))}
            </div>
            <SummaryPieChart series={points} sign={sign} setFilter={setFilter} />
        </div>
    );
};
