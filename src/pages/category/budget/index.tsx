import { AssignmentLate, OpenInNew } from "@mui/icons-material";
import { Button, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { last } from "lodash";
import { DateTime } from "luxon";
import numeral from "numeral";
import React, { useCallback } from "react";
import { BasicFillbar } from "../../../components/display/BasicFillbar";
import { NonIdealState } from "../../../components/display/NonIdealState";
import { Section } from "../../../components/layout";
import { ChartDomainFunctions, getChartDomainFunctions } from "../../../shared/data";
import { TopHatDispatch } from "../../../state";
import { AppSlice } from "../../../state/app";
import { useCategoryPageCategory } from "../../../state/app/hooks";
import { Category } from "../../../state/data";
import { useCategoryByID, useFormatValue } from "../../../state/data/hooks";
import { getToday } from "../../../state/shared/values";
import { Greys, Intents } from "../../../styles/colours";
import { CategoryBudgetTransferElements } from "./transfers";

const useStyles = makeStyles({
    container: {
        display: "flex",
        flexDirection: "column",
    },
});

export const CategoryPageBudgetSummary: React.FC = () => {
    const classes = useStyles();
    const category = useCategoryPageCategory();
    const openEditView = useCallback(
        () => TopHatDispatch(AppSlice.actions.setDialogPartial({ id: "category", category })),
        [category]
    );

    const toplevel = useCategoryByID(last(category.hierarchy)) || category;

    if (!toplevel.budgets)
        return (
            <Section title="Budget" PaperClassName={classes.container}>
                <NonIdealState
                    icon={AssignmentLate}
                    title="No Budget Created"
                    subtitle="This category does not have a budget set up - add one in the edit view to start tracking over time"
                    action={
                        <Button onClick={openEditView} startIcon={<OpenInNew />}>
                            Add Budget
                        </Button>
                    }
                />
            </Section>
        );

    const total = getMonthlyTotal(toplevel, 0);
    const subtotal = getMonthlyTotal(category, 0);
    const budget = toplevel.budgets.values[0];
    const lastTotal = getMonthlyTotal(toplevel, 1);
    const lastSubtotal = getMonthlyTotal(category, 1);
    const lastBudget = toplevel.budgets.values[1];
    const chartFunctions = getChartDomainFunctions([total, budget, lastTotal, lastBudget], 0.2);

    return (
        <Section title="Budget" PaperClassName={classes.container}>
            <FillbarSummaryNumbers
                total={total}
                subtotal={subtotal}
                budget={budget}
                date={getToday()}
                subtitle="of budget so far"
                functions={chartFunctions}
            />
            <FillbarSummaryNumbers
                total={lastTotal}
                subtotal={lastSubtotal}
                budget={lastBudget}
                date={getToday().minus({ months: 1 })}
                subtitle="of budget last month"
                functions={chartFunctions}
            />
            <CategoryBudgetTransferElements category={category} />
        </Section>
    );
};

const getMonthlyTotal = (category: Category, month: number) =>
    (category.transactions.credits[month] || 0) + (category.transactions.debits[month] || 0);

const useFillbarSummaryNumbersStyles = makeStyles({
    title: {
        display: "flex",
        justifyContent: "space-between",
        color: Greys[700],
    },
    subtitle: {
        display: "flex",
        justifyContent: "space-between",
        color: Greys[700],
    },
    fillbar: {
        height: 35,
        marginTop: 10,
        marginBottom: 20,
        flexGrow: 1,
    },
});
const FillbarSummaryNumbers: React.FC<{
    total: number;
    subtotal: number;
    budget: number;
    date: DateTime;
    functions: ChartDomainFunctions;
    subtitle: string;
}> = ({ total, subtotal, budget, date, functions, subtitle }) => {
    const classes = useFillbarSummaryNumbersStyles();
    const format = useFormatValue("0,0.00");
    const success = budget === total ? null : budget > 0 ? budget > total : budget < total;

    return (
        <>
            <div className={classes.title}>
                <Typography variant="h6">{date.toFormat("LLLL yyyy")}</Typography>
                <Typography
                    variant="h6"
                    style={{ color: Intents[success === null ? "primary" : success ? "success" : "danger"].main }}
                >
                    {format(subtotal)}
                </Typography>
            </div>
            <div className={classes.subtitle}>
                <Typography variant="caption">
                    {budget ? numeral(subtotal / budget).format("0.00%") : "-.--%"} {subtitle}
                </Typography>
                <Typography variant="caption">/ {numeral(budget).format("0,0.00")}</Typography>
            </div>
            <div className={classes.fillbar}>
                <BasicFillbar
                    range={[0, total - subtotal, total]}
                    showEndpoint={true}
                    secondary={budget}
                    functions={functions}
                    success={success}
                />
            </div>
        </>
    );
};