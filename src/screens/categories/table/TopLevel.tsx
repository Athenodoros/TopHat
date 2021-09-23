import { ButtonBase, Card, makeStyles, Typography } from "@material-ui/core";
import chroma from "chroma-js";
import clsx from "clsx";
import { reverse } from "lodash";
import numeral from "numeral";
import React, { useCallback } from "react";
import { BasicChartDomainFunctions } from "../../../components/display/BasicBarChart";
import { BasicFillbar } from "../../../components/display/BasicFillbar";
import { getCategoryIcon } from "../../../components/display/ObjectDisplay";
import { TopHatDispatch } from "../../../state";
import { AppSlice } from "../../../state/app";
import { Category } from "../../../state/data";
import { useCategoryMap, useFormatValue } from "../../../state/data/hooks";
import { ID } from "../../../state/utilities/values";
import { Greys, Intents } from "../../../styles/colours";
import { useCategoriesTableStyles } from "./styles";
import { SubCategoryTableView } from "./SubCategory";

const useStyles = makeStyles({
    container: {
        margin: "10px 0",
        position: "relative",
        overflow: "hidden",
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
        pointerEvents: "none",
    },
    toplevel: {
        display: "flex",
        height: 60,
        width: "100%",
        alignItems: "center",

        "&:hover": {
            background: chroma(Greys[500]).alpha(0.1).hex(),
        },
    },
    fillbar: { height: 35 },
    icon: {
        height: 20,
        width: 20,
        marginLeft: 30,
        marginRight: 20,
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
    chartFunctions: BasicChartDomainFunctions;
    getCategoryStatistics: (category: Category) => { value: number; budget?: number; success?: boolean | null };
}
export const TopLevelCategoryTableView: React.FC<TopLevelCategoryViewProps> = ({
    category,
    graph,
    chartFunctions,
    getCategoryStatistics,
}) => {
    const tableClasses = useCategoriesTableStyles();
    const classes = useStyles();

    const format = useFormatValue("0,0.00");

    const categories = useCategoryMap();
    let running: Record<number, number> = { 0: 0 }; // Depth -> Running Total
    const getNestedSubcategoryNodes = (id: ID, depth: number = 0): JSX.Element[] => {
        running[depth + 1] = running[depth];
        const children = graph[id].flatMap((child) => getNestedSubcategoryNodes(child, depth + 1));

        const statistic = getCategoryStatistics(categories[id]!).value;
        const results = [
            <SubCategoryTableView
                key={id}
                id={id}
                depth={depth}
                chartFunctions={chartFunctions}
                success={category.success ?? null}
                format={format}
                range={[running[depth], running[depth + 1], running[depth] + statistic]}
                // range={[running[depth + 1], running[depth + 1], running[depth] + statistic]}
            />,
        ].concat(reverse(children));

        running[depth] += statistic;
        return results;
    };
    const subcategories = reverse(graph[category.id].map((child) => getNestedSubcategoryNodes(child)));

    const onClick = useCallback(
        () => TopHatDispatch(AppSlice.actions.setPageState({ id: "category", category: category.id })),
        [category.id]
    );

    return (
        <Card className={classes.container}>
            <ButtonBase className={classes.toplevel} onClick={onClick}>
                <div className={tableClasses.title}>
                    {getCategoryIcon(category, classes.icon)}
                    <Typography variant="h5" noWrap={true}>
                        {category.name}
                    </Typography>
                </div>
                <div className={tableClasses.main}>
                    <div className={tableClasses.subtitle} />
                    <div className={clsx(tableClasses.fillbar, classes.fillbar)}>
                        <BasicFillbar
                            range={[0, 0, category.value]}
                            // range={[0, running[0], category.value]}
                            showEndpoint={true}
                            secondary={category.budget}
                            functions={chartFunctions}
                            success={category.success ?? null}
                        />
                    </div>
                    <div className={tableClasses.total}>
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
                            {format(category.value)}
                        </Typography>
                        {category.budget !== undefined ? (
                            <Typography variant="caption" className={classes.budget}>
                                / {numeral(category.budget).format("0,0.00")}
                            </Typography>
                        ) : undefined}
                    </div>
                </div>
            </ButtonBase>
            <div className={classes.colour} style={{ background: category.colour }} />
            {subcategories}
        </Card>
    );
};
