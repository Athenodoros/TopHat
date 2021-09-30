import {
    AccountTree,
    AssignmentLate,
    DeleteTwoTone,
    Edit,
    KeyboardArrowDown,
    OpenInFullTwoTone,
    OpenInNew,
    SwapHoriz,
} from "@mui/icons-material";
import { Button, Collapse, IconButton, TextField, Tooltip, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import numeral from "numeral";
import React, { useCallback, useMemo, useState } from "react";
import { getBasicChartFunctions } from "../../components/display/BasicBarChart";
import { BasicFillbar } from "../../components/display/BasicFillbar";
import { NonIdealState } from "../../components/display/NonIdealState";
import { getCategoryIcon } from "../../components/display/ObjectDisplay";
import { ObjectSelector } from "../../components/inputs";
import { Section } from "../../components/layout";
import { useNumericInputHandler } from "../../shared/hooks";
import { TopHatDispatch } from "../../state";
import { AppSlice } from "../../state/app";
import { useCategoryPageCategory } from "../../state/app/hooks";
import { Category, DataSlice, PLACEHOLDER_CATEGORY_ID } from "../../state/data";
import { useAllCategories, useFormatValue } from "../../state/data/hooks";
import { TRANSFER_CATEGORY_ID } from "../../state/data/shared";
import { getToday, ID } from "../../state/shared/values";
import { Greys, Intents } from "../../styles/colours";
// import { NonIdealState } from "../../components/display/NonIdealState";

const useStyles = makeStyles({
    container: {
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
        marginBottom: 20,
        flexGrow: 1,
    },
    actions: {
        display: "flex",
        justifyContent: "flex-end",

        "& .MuiCollapse-wrapperInner": {
            display: "flex",
            alignItems: "center",
        },
    },
    edit: {
        marginRight: 15,
        padding: "6px 12px",
    },
    transfer: {
        "& .MuiCollapse-wrapperInner": {
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
        },
    },
});

export const CategoryPageBudgetSummary: React.FC = () => {
    const classes = useStyles();
    const category = useCategoryPageCategory();
    const format = useFormatValue("0,0.00");

    const [transfer, setTransfer] = useState(false);
    const openTransfer = useCallback(() => setTransfer(true), []);
    const closeTransfer = useCallback(() => setTransfer(false), []);
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
                <Collapse in={!transfer} orientation="horizontal">
                    <Button color="warning" startIcon={<Edit />} onClick={openEditView} className={classes.edit}>
                        EDIT
                    </Button>
                    <Button variant="outlined" startIcon={<SwapHoriz />} onClick={openTransfer}>
                        TRANSFER
                    </Button>
                </Collapse>
                <Collapse in={transfer} orientation="horizontal" className={classes.transfer}>
                    <BudgetTransferElements category={category} close={closeTransfer} />
                </Collapse>
            </div>
        </Section>
    );
};

const useBudgetTransferStyles = makeStyles({
    category: {
        textTransform: "inherit",
        height: 40,
        width: 160,

        "& > p": {
            flexGrow: 1,
            textAlign: "left",
            marginLeft: 10,
        },
        "& > svg": {
            marginLeft: 15,
        },
    },
    icon: {
        width: 16,
        height: 16,
    },
    input: {
        margin: "0 13px",
        "& input": {
            width: 80,
        },
    },
    actions: {
        display: "flex",
        "& button:not(:last-child)": {
            marginRight: 6,
        },
    },
});
const BudgetTransferElements: React.FC<{ category: Category; close: () => void }> = ({ category, close }) => {
    const classes = useBudgetTransferStyles();
    const categories = useAllCategories();
    const options = useMemo(
        () =>
            categories.filter(
                ({ id, hierarchy, budgets }) =>
                    budgets &&
                    hierarchy.length === 0 &&
                    id !== category.id &&
                    id !== PLACEHOLDER_CATEGORY_ID &&
                    id !== TRANSFER_CATEGORY_ID
            ),
        [categories, category.id]
    );
    const [selected, setSelected] = useState(options[0]);
    const setSelectedCategory = useCallback(
        (selection: ID) => setSelected(options.find(({ id }) => id === selection)!),
        [setSelected, options]
    );

    const [value, setValue] = useState<number | null>(0);
    const numericInputHander = useNumericInputHandler(value, setValue, category.id);

    const submit = useCallback(() => {
        TopHatDispatch(
            DataSlice.actions.updateCategoryBudgets({
                [category.id]: category.budgets!.values[0] + (value || 0),
                [selected.id]: selected.budgets!.values[0] - (value || 0),
            })
        );
        close();
    }, [category, selected, value, close]);

    return (
        <>
            <ObjectSelector
                options={options}
                render={(category) => getCategoryIcon(category, classes.icon)}
                selected={selected.id}
                setSelected={setSelectedCategory}
            >
                <Button variant="outlined" className={classes.category} color="inherit">
                    {getCategoryIcon(selected, classes.icon)}
                    <Typography variant="body1" noWrap={true}>
                        {selected.name}
                    </Typography>
                    <KeyboardArrowDown fontSize="small" htmlColor={Greys[600]} />
                </Button>
            </ObjectSelector>
            <TextField
                className={classes.input}
                value={numericInputHander.text}
                onChange={numericInputHander.onTextChange}
                size="small"
                label="Value"
            />
            <div className={classes.actions}>
                <Tooltip title="Cancel Transfer">
                    <IconButton color="warning" size="small" onClick={close}>
                        <DeleteTwoTone fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Update Budgets">
                    <span>
                        <IconButton color="primary" size="small" disabled={!value} onClick={submit}>
                            <OpenInFullTwoTone fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
            </div>
        </>
    );
};
