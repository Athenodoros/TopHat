import { AccountTree, AssignmentLate, Edit, OpenInNew, SwapHoriz } from "@mui/icons-material";
import { Button, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import numeral from "numeral";
import React, { useCallback } from "react";
import { getBasicChartFunctions } from "../../components/display/BasicBarChart";
import { BasicFillbar } from "../../components/display/BasicFillbar";
import { NonIdealState } from "../../components/display/NonIdealState";
import { Section } from "../../components/layout";
import { TopHatDispatch } from "../../state";
import { AppSlice } from "../../state/app";
import { useCategoryPageCategory } from "../../state/app/hooks";
import { useFormatValue } from "../../state/data/hooks";
import { getToday } from "../../state/utilities/values";
import { Greys, Intents } from "../../styles/colours";
// import { NonIdealState } from "../../components/display/NonIdealState";

const useStyles = makeStyles({
    container: {
        height: 340,
        display: "flex",
        flexDirection: "column",
    },
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
        marginBottom: 30,
        flexGrow: 1,
    },
    actions: {
        display: "flex",
        justifyContent: "flex-end",

        "& > button:first-child": {
            marginRight: 15,
            padding: "6px 12px",
        },
    },
});

export const CategoryPageBudgetSummary: React.FC = () => {
    const classes = useStyles();
    const category = useCategoryPageCategory();
    const format = useFormatValue("0,0.00");

    const openEditView = useCallback(
        () => TopHatDispatch(AppSlice.actions.setDialogPartial({ id: "category", category })),
        [category]
    );

    if (category.hierarchy.length)
        return (
            <Section title="Budget" PaperClassName={classes.container}>
                <NonIdealState
                    icon={AccountTree}
                    title="No Budget Available"
                    subtitle="Only top-level categories have budgets - remove the parent category to start budgeting"
                    action={
                        <Button onClick={openEditView} startIcon={<OpenInNew />}>
                            Edit Category
                        </Button>
                    }
                />
            </Section>
        );
    if (!category.budgets)
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

    const total = (category.transactions.credits[0] || 0) + (category.transactions.debits[0] || 0);
    const budget = category.budgets.values[0];
    const success = budget === total ? null : budget > 0 ? budget > total : budget < total;

    const lastTotal = (category.transactions.credits[1] || 0) + (category.transactions.debits[1] || 0);
    const lastBudget = category.budgets.values[1];
    const lastSuccess =
        lastBudget === lastTotal ? null : lastBudget > 0 ? lastBudget > lastTotal : lastBudget < lastTotal;

    const chartFunctions = getBasicChartFunctions([total, budget, lastTotal, lastBudget], 0.2);

    return (
        <Section title="Budget" PaperClassName={classes.container}>
            <div className={classes.title}>
                <Typography variant="h6">{getToday().toFormat("LLLL yyyy")}</Typography>
                <Typography variant="h6" style={{ color: Intents[success ? "success" : "danger"].main }}>
                    {format(total)}
                </Typography>
            </div>
            <div className={classes.subtitle}>
                <Typography variant="caption">{numeral(total / budget).format("0.00%")} of budget so far</Typography>
                <Typography variant="caption">/ {numeral(budget).format("0,0.00")}</Typography>
            </div>
            <div className={classes.fillbar}>
                <BasicFillbar
                    range={[0, 0, total]}
                    showEndpoint={true}
                    secondary={budget}
                    functions={chartFunctions}
                    success={success ?? null}
                />
            </div>
            <div className={classes.title}>
                <Typography variant="h6">{getToday().minus({ months: 1 }).toFormat("LLLL yyyy")}</Typography>
                <Typography variant="h6" style={{ color: Intents[lastSuccess ? "success" : "danger"].main }}>
                    {format(lastTotal)}
                </Typography>
            </div>
            <div className={classes.subtitle}>
                <Typography variant="caption">
                    {numeral(lastTotal / lastBudget).format("0.00%")} of budget last month
                </Typography>
                <Typography variant="caption">/ {numeral(lastBudget).format("0,0.00")}</Typography>
            </div>
            <div className={classes.fillbar}>
                <BasicFillbar
                    range={[0, 0, lastTotal]}
                    showEndpoint={true}
                    secondary={lastBudget}
                    functions={chartFunctions}
                    success={lastSuccess ?? null}
                />
            </div>
            <div className={classes.actions}>
                <Button color="warning" startIcon={<Edit />}>
                    EDIT
                </Button>
                <Button variant="outlined" startIcon={<SwapHoriz />}>
                    TRANSFER
                </Button>
            </div>
        </Section>
    );
};
