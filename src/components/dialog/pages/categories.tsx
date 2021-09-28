import { Clear, FastForward, Forward10, KeyboardArrowDown, LooksOne, ShoppingBasket, Sync } from "@mui/icons-material";
import {
    Button,
    IconButton,
    List,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import clsx from "clsx";
import { range } from "lodash";
import React, { useCallback, useMemo, useState } from "react";
import { TopHatStore } from "../../../state";
import { useDialogState } from "../../../state/app/hooks";
import { Category } from "../../../state/data";
import { getCategoryColour, useAllCategories, useCategoryByID } from "../../../state/data/hooks";
import {
    getNextID,
    PLACEHOLDER_CATEGORY,
    PLACEHOLDER_CATEGORY_ID,
    TRANSFER_CATEGORY_ID,
} from "../../../state/data/utilities";
import { BaseTransactionHistory, getRandomColour, getTodayString, ID } from "../../../state/utilities/values";
import { Greys } from "../../../styles/colours";
import { handleButtonGroupChange } from "../../../utilities/events";
import { useNumericInputHandler } from "../../../utilities/hooks";
import { BasicBarChart } from "../../display/BasicBarChart";
import { SingleCategoryMenu } from "../../display/CategoryMenu";
import { NonIdealState } from "../../display/NonIdealState";
import { getCategoryIcon } from "../../display/ObjectDisplay";
import { ObjectSelector } from "../../inputs";
import {
    DialogContents,
    DialogMain,
    DialogOptions,
    DialogSelectorAddNewButton,
    EditTitleContainer,
    EditValueContainer,
    getUpdateFunctions,
    ObjectEditContainer,
    useDialogObjectSelectorStyles,
} from "../utilities";

export const DialogCategoriesView: React.FC = () => {
    const classes = useDialogObjectSelectorStyles();
    const selected = useDialogState("category", (object) => object?.id);

    return (
        <DialogMain onClick={remove}>
            <DialogOptions>
                <div className={classes.options}>
                    <List>
                        <SingleCategoryMenu
                            setSelected={set}
                            selected={selected}
                            exclude={[PLACEHOLDER_CATEGORY_ID, TRANSFER_CATEGORY_ID]}
                        />
                    </List>
                </div>
                <DialogSelectorAddNewButton type="category" onClick={createNewCategory} />
            </DialogOptions>
            <DialogContents>
                {selected !== undefined ? (
                    <EditCategoryView />
                ) : (
                    <NonIdealState
                        icon={ShoppingBasket}
                        title="Categories"
                        subtitle="Categories are a way to break down income and expenses into manageable chunks for tracking and budgeting."
                    />
                )}
            </DialogContents>
        </DialogMain>
    );
};

const createNewCategory = () =>
    set({
        id: getNextID(TopHatStore.getState().data.category.ids),
        name: "New Category",
        hierarchy: [],
        colour: getRandomColour(),
        transactions: BaseTransactionHistory(),
    });

const useEditViewStyles = makeStyles({
    colourContainer: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: 90,

        "& input": { width: 40, height: 40 },
    },
    colourContainerDisabled: {
        opacity: 0.3,
        pointerEvents: "none",
    },
    icon: {
        height: 24,
        width: 24,
        marginRight: 15,
        borderRadius: 5,
    },
    category: {
        textTransform: "inherit",
        height: 40,

        "& > svg": {
            marginLeft: 15,
        },
    },
    valueContainer: {
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
    },
    valueChart: {
        height: 30,
        marginBottom: 10,
    },
    values: {
        display: "flex",
        justifyContent: "space-between",
        marginTop: 5,

        "& > *": { width: 160 },
    },
    toggles: {
        flexGrow: 1,
        "& > button": {
            flexGrow: 1,
            padding: 5,
        },
    },
    toggle: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: 60,
    },
    toggleInner: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
    },
});
const EditCategoryView: React.FC = () => {
    const classes = useEditViewStyles();
    const working = useDialogState("category")!;
    const categories = useAllCategories();
    const parentOptions = useMemo(
        () =>
            categories.filter(
                ({ id }) =>
                    !working.hierarchy.concat([PLACEHOLDER_CATEGORY_ID, TRANSFER_CATEGORY_ID, working.id]).includes(id)
            ),
        [categories, working.id, working.hierarchy]
    );
    const parent: Category | undefined = useCategoryByID(working.hierarchy[0]);

    const [selectedMonth, setSelectedMonthRaw] = useState(0);
    const month = useNumericInputHandler(
        working.budgets?.values[selectedMonth] ?? null,
        updateMonthsBudget(selectedMonth),
        working.id
    );
    const base = useNumericInputHandler(working.budgets?.base ?? null, updateBaseBudget, working.id);
    const setSelectedMonth = useCallback(
        (value: number) => {
            setSelectedMonthRaw(value);
            month.setValue(working.budgets?.values[value] ?? null);
        },
        [month, working.budgets?.values]
    );

    // These dummies are to help ESLint work out the dependencies of the callback
    const setMonthValue = month.setValue;
    const setBaseValue = base.setValue;
    const onReset = useCallback(() => {
        const actual = TopHatStore.getState().data.category.entities[working.id];
        if (actual) {
            setMonthValue(actual.budgets?.values[selectedMonth] ?? null);
            setBaseValue(actual.budgets?.base ?? null);
        }
    }, [setMonthValue, setBaseValue, working.id, selectedMonth]);

    const updateBudgetStrategy = useMemo(
        () =>
            handleButtonGroupChange((strategy: NonNullable<Category["budgets"]>["strategy"] | "none") => {
                if (strategy === "none") {
                    setMonthValue(0);
                    setBaseValue(0);
                }
                updateBudget(strategy !== "none" ? { strategy } : undefined);
            }),
        [setBaseValue, setMonthValue]
    );

    return (
        <ObjectEditContainer type="category" onReset={onReset}>
            <EditValueContainer label="Parent">
                <ObjectSelector<true, Category>
                    options={parentOptions}
                    render={(category) => getCategoryIcon(category, classes.icon)}
                    selected={parent?.id}
                    setSelected={updateWorkingParent}
                    placeholder={
                        <>
                            {getCategoryIcon(PLACEHOLDER_CATEGORY, classes.icon)}
                            <Typography variant="body1" noWrap={true}>
                                No Parent
                            </Typography>
                        </>
                    }
                >
                    <Button variant="outlined" className={classes.category}>
                        {getCategoryIcon(parent || PLACEHOLDER_CATEGORY, classes.icon)}
                        <Typography variant="body1" noWrap={true}>
                            {parent?.name || "No Parent"}
                        </Typography>
                        <KeyboardArrowDown fontSize="small" htmlColor={Greys[600]} />
                    </Button>
                </ObjectSelector>
            </EditValueContainer>
            <EditValueContainer label="Colour" disabled={parent && "Child categories inherit their parent's colour"}>
                <div className={clsx(classes.colourContainer, parent && classes.colourContainerDisabled)}>
                    <input type="color" value={getCategoryColour(working.id, working)} onChange={handleColorChange} />
                    <IconButton size="small" onClick={generateRandomColour}>
                        <Tooltip title="Get random colour">
                            <Sync />
                        </Tooltip>
                    </IconButton>
                </div>
            </EditValueContainer>
            <EditTitleContainer title="Budget" />
            <EditValueContainer
                label="Type"
                disabled={parent ? "Child categories inherit their parent's budget" : undefined}
            >
                <ToggleButtonGroup
                    size="small"
                    value={working.budgets?.strategy || "none"}
                    exclusive={true}
                    onChange={updateBudgetStrategy}
                    className={classes.toggles}
                >
                    <ToggleButton value="none" classes={{ root: classes.toggle }}>
                        <Tooltip title="Do not budget this category">
                            <div className={classes.toggleInner}>
                                <Clear fontSize="small" />
                                <Typography variant="caption">None</Typography>
                            </div>
                        </Tooltip>
                    </ToggleButton>
                    <ToggleButton value="base" classes={{ root: classes.toggle }}>
                        <Tooltip title="Set a constant budget each month">
                            <div className={classes.toggleInner}>
                                <LooksOne fontSize="small" />
                                <Typography variant="caption">Constant</Typography>
                            </div>
                        </Tooltip>
                    </ToggleButton>
                    <ToggleButton value="copy" classes={{ root: classes.toggle }}>
                        <Tooltip title="Copy previous month's budget">
                            <div className={classes.toggleInner}>
                                <FastForward fontSize="small" />
                                <Typography variant="caption">Copy</Typography>
                            </div>
                        </Tooltip>
                    </ToggleButton>
                    <ToggleButton value="rollover" classes={{ root: classes.toggle }}>
                        <Tooltip title="Roll over unused budget each month">
                            <div className={classes.toggleInner}>
                                <Forward10 fontSize="small" />
                                <Typography variant="caption">Rollover</Typography>
                            </div>
                        </Tooltip>
                    </ToggleButton>
                </ToggleButtonGroup>
            </EditValueContainer>
            <EditValueContainer
                label="Value"
                disabled={
                    parent
                        ? "Child categories inherit their parent's budget"
                        : !working.budgets
                        ? "This Category does not have a budget!"
                        : ""
                }
            >
                <div className={classes.valueContainer}>
                    <BasicBarChart
                        className={classes.valueChart}
                        values={working.budgets ? working.budgets.values.map((x) => -x) : BaseBudget}
                        selected={selectedMonth}
                        setSelected={setSelectedMonth}
                    />
                    <div className={classes.values}>
                        <TextField
                            value={month.text}
                            onChange={month.onTextChange}
                            size="small"
                            label="Current Month"
                        />
                        <TextField
                            value={base.text}
                            onChange={base.onTextChange}
                            size="small"
                            label={working.budgets?.strategy !== "rollover" ? "Monthly Budget" : "Monthly Increase"}
                            disabled={working.budgets?.strategy === "copy"}
                        />
                    </div>
                </div>
            </EditValueContainer>
        </ObjectEditContainer>
    );
};

const { update, remove, set, getWorking } = getUpdateFunctions("category");
const handleColorChange: React.ChangeEventHandler<HTMLInputElement> = (event) => update("colour")(event.target.value);
const generateRandomColour = () => update("colour")(getRandomColour());
const updateWorkingParent = (id?: ID) => {
    update("hierarchy")(
        id === undefined ? [] : [id].concat(TopHatStore.getState().data.category.entities[id]!.hierarchy ?? [])
    );
};

const BaseBudget = range(24).map((_) => 0);
const updateBudget = (partial?: Partial<NonNullable<Category["budgets"]>>) => {
    const current = getWorking();
    update("budgets")(
        partial && {
            ...(current.budgets || {
                start: getTodayString(),
                values: BaseBudget,
                strategy: "base",
                base: 0,
            }),
            ...partial,
        }
    );
};
const updateMonthsBudget = (index: number) => (value: number | null) => {
    const current = getWorking().budgets?.values || BaseBudget;
    current[index] = value ?? 0;
    updateBudget({ values: current });
};
const updateBaseBudget = (value: number | null) => updateBudget({ base: value || 0 });
