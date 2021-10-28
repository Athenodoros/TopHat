import styled from "@emotion/styled";
import { AssignmentLate, OpenInNew } from "@mui/icons-material";
import { Button, Typography } from "@mui/material";
import { last } from "lodash";
import { DateTime } from "luxon";
import React, { useCallback } from "react";
import { BasicFillbar } from "../../../components/display/BasicFillbar";
import { NonIdealState } from "../../../components/display/NonIdealState";
import { Section } from "../../../components/layout";
import { ChartDomainFunctions, formatNumber, getChartDomainFunctions } from "../../../shared/data";
import { TopHatDispatch } from "../../../state";
import { AppSlice } from "../../../state/app";
import { useCategoryPageCategory } from "../../../state/app/hooks";
import { Category } from "../../../state/data";
import { useCategoryByID, useFormatValue } from "../../../state/data/hooks";
import { getToday } from "../../../state/shared/values";
import { Greys, Intents } from "../../../styles/colours";
import { CategoryBudgetTransferElements } from "./transfers";

const SectionSx = { display: "flex", flexDirection: "column" } as const;

export const CategoryPageBudgetSummary: React.FC = () => {
    const category = useCategoryPageCategory();
    const openEditView = useCallback(
        () => TopHatDispatch(AppSlice.actions.setDialogPartial({ id: "category", category })),
        [category]
    );

    const toplevel = useCategoryByID(last(category.hierarchy)) || category;

    if (!toplevel.budgets)
        return (
            <Section title="Budget" PaperSx={SectionSx}>
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
        <Section title="Budget" PaperSx={SectionSx}>
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

const FillbarSummaryNumbers: React.FC<{
    total: number;
    subtotal: number;
    budget: number;
    date: DateTime;
    functions: ChartDomainFunctions;
    subtitle: string;
}> = ({ total, subtotal, budget, date, functions, subtitle }) => {
    const format = useFormatValue();
    const success = budget === total ? null : budget > 0 ? budget > total : budget < total;

    return (
        <>
            <TitleBox>
                <Typography variant="h6" noWrap={true}>
                    {date.toFormat("LLLL yyyy")}
                </Typography>
                <Typography
                    noWrap={true}
                    variant="h6"
                    style={{ color: Intents[success === null ? "primary" : success ? "success" : "danger"].main }}
                >
                    {format(subtotal)}
                </Typography>
            </TitleBox>
            <SubtitleBox>
                <Typography variant="caption" noWrap={true}>
                    {budget ? formatNumber(subtotal / budget, { end: "%" }) : "-.--%"} {subtitle}
                </Typography>
                <Typography noWrap={true} variant="caption">
                    / {formatNumber(budget)}
                </Typography>
            </SubtitleBox>
            <FillbarBox>
                <BasicFillbar
                    range={[0, total - subtotal, total]}
                    showEndpoint={true}
                    secondary={budget}
                    functions={functions}
                    success={success}
                />
            </FillbarBox>
        </>
    );
};

const TitleBox = styled("div")({
    display: "flex",
    justifyContent: "space-between",
    color: Greys[700],
});
const SubtitleBox = styled("div")({
    display: "flex",
    justifyContent: "space-between",
    color: Greys[700],
});
const FillbarBox = styled("div")({
    height: 35,
    marginTop: 10,
    marginBottom: 20,
    flexGrow: 1,
});
