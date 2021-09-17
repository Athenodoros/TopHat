import { Card, makeStyles, Typography } from "@material-ui/core";
import numeral from "numeral";
import React from "react";
import { BasicChartDomainSpec } from "../../../components/display/BasicBarChart";
import { BasicFillbar } from "../../../components/display/BasicFillbar";
import { getCategoryIcon } from "../../../components/display/ObjectDisplay";
import { ID } from "../../../state/utilities/values";
import { Greys, Intents } from "../../../styles/colours";

const useTopLevelStyles = makeStyles({
    container: {
        position: "relative",
        overflow: "hidden",
        margin: "12px 0",
    },
    colour: {
        position: "absolute",
        width: 300,
        height: 280,
        borderRadius: 50,
        top: -180,
        left: -140,
        transform: "rotate(-20deg)",
        opacity: 0.1,
    },
    main: {
        display: "flex",
        height: 64,
        alignItems: "center",
    },
    title: {
        display: "flex",
        alignItems: "center",
        flexGrow: 1,
    },
    icon: {
        height: 20,
        width: 20,
        marginLeft: 30,
        marginRight: 20,
    },
    fillbar: {},
    total: {
        width: 250,
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "flex-end",
        marginRight: 40,
    },
    blue: {
        color: Intents.primary.main,
        lineHeight: 1,
    },
    green: {
        color: Intents.success.main,
        lineHeight: 1,
    },
    red: {
        color: Intents.danger.main,
        lineHeight: 1,
    },
    budget: {
        color: Greys[700],
        marginLeft: 5,
    },
});

export interface TopLevelCategoryViewProps {
    category: {
        id: ID;
        name: string;
        colour: string;
        value: number;
        budget?: number;
        success?: boolean | null;
    };
    graph: Record<ID, ID[]>;
    fillbarDomainSpecs: BasicChartDomainSpec;
}
export const TopLevelCategoryView: React.FC<TopLevelCategoryViewProps> = ({ category, graph, fillbarDomainSpecs }) => {
    const classes = useTopLevelStyles();

    return (
        <Card className={classes.container}>
            <div className={classes.colour} style={{ background: category.colour }} />
            <div className={classes.main}>
                <div className={classes.title}>
                    {getCategoryIcon(category, classes.icon)}
                    <Typography variant="h5" noWrap={true}>
                        {category.name}
                    </Typography>
                </div>
                <div className={classes.fillbar}>
                    <BasicFillbar
                        value={category.value}
                        secondary={category.budget}
                        spec={fillbarDomainSpecs}
                        success={category.success}
                    />
                </div>
                <div className={classes.total}>
                    <Typography
                        variant="h5"
                        className={
                            category.budget !== undefined
                                ? category.success
                                    ? classes.green
                                    : classes.red
                                : classes.blue
                        }
                    >
                        {numeral(category.value).format("0,0.00")}
                    </Typography>
                    {category.budget !== undefined ? (
                        <Typography variant="caption" className={classes.budget}>
                            / {numeral(category.budget).format("0,0.00")}
                        </Typography>
                    ) : undefined}
                </div>
            </div>
        </Card>
    );
};
