import styled from "@emotion/styled";
import {
    Clear,
    FastForward,
    Forward10,
    KeyboardArrowDown,
    LooksOne,
    ShoppingBasket,
    Shuffle,
    Sync,
} from "@mui/icons-material";
import { Button, IconButton, List, Menu, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from "@mui/material";
import { Box } from "@mui/system";
import { range } from "lodash";
import React, { useCallback, useMemo } from "react";
import { SingleCategoryMenu } from "../../components/display/CategoryMenu";
import { NonIdealState } from "../../components/display/NonIdealState";
import { getCategoryColour, getCategoryIcon } from "../../components/display/ObjectDisplay";
import { formatNumber } from "../../shared/data";
import { handleButtonGroupChange } from "../../shared/events";
import { usePopoverProps } from "../../shared/hooks";
import { TopHatDispatch, TopHatStore } from "../../state";
import { useDialogState } from "../../state/app/hooks";
import { Category, DataSlice } from "../../state/data";
import { useAllCategories, useCategoryByID, useDefaultCurrency } from "../../state/data/hooks";
import {
    getNextID,
    PLACEHOLDER_CATEGORY,
    PLACEHOLDER_CATEGORY_ID,
    TRANSFER_CATEGORY_ID,
} from "../../state/data/shared";
import { BaseTransactionHistory, getRandomColour, getTodayString, ID } from "../../state/shared/values";
import { Greys } from "../../styles/colours";
import { DialogContents, DialogMain, DialogOptions, EditTitleContainer, EditValueContainer } from "../shared";
import { useTimeSeriesInput } from "../shared/TimeSeriesInput";
import { DialogObjectOptionsBox, DialogSelectorAddNewButton, getUpdateFunctions, ObjectEditContainer } from "./shared";

export const DialogCategoriesView: React.FC = () => {
    const selected = useDialogState("category", (object) => object?.id);

    return (
        <DialogMain onClick={remove}>
            <DialogOptions>
                <DialogObjectOptionsBox>
                    <List>
                        <SingleCategoryMenu
                            setSelected={set}
                            selected={selected}
                            exclude={[PLACEHOLDER_CATEGORY_ID, TRANSFER_CATEGORY_ID]}
                        />
                    </List>
                </DialogObjectOptionsBox>
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
                        action={
                            <Button sx={{ marginTop: 20 }} startIcon={<Shuffle />} onClick={regenerateCategoryColours}>
                                Regenerate Colours
                            </Button>
                        }
                    />
                )}
            </DialogContents>
        </DialogMain>
    );
};

export const createNewCategory = () =>
    set({
        id: getNextID(TopHatStore.getState().data.category.ids),
        name: "New Category",
        hierarchy: [],
        colour: getRandomColour(),
        transactions: BaseTransactionHistory(),
    });

const regenerateCategoryColours = () => TopHatDispatch(DataSlice.actions.regenerateCategoryColours());

const EditCategoryView: React.FC = () => {
    const working = useDialogState("category")!;
    const parent: Category | undefined = useCategoryByID(working.hierarchy[0]);

    const timeSeriesInput = useCategoryBudgetInput(working);

    const updateBudgetStrategy = useMemo(
        () =>
            handleButtonGroupChange((strategy: NonNullable<Category["budgets"]>["strategy"] | "none") => {
                if (!strategy) return;

                if (strategy === "none") {
                    timeSeriesInput.setValues(0);
                }
                updateBudget(strategy !== "none" ? { strategy } : undefined);
            }),
        [timeSeriesInput]
    );

    const parentButtonPopover = usePopoverProps();
    const setIsPopoverOpen = parentButtonPopover.setIsOpen;
    const handleChangeCategory = useCallback(
        (category?: Category) => {
            if (category) {
                updateWorkingParent(category.id === PLACEHOLDER_CATEGORY_ID ? undefined : category.id);
                setIsPopoverOpen(false);
            }
        },
        [setIsPopoverOpen]
    );

    const categories = useAllCategories();
    const childCategoryIDs = useMemo(
        () => categories.filter(({ hierarchy }) => hierarchy.includes(working.id)).map(({ id }) => id),
        [working.id, categories]
    );

    return (
        <ObjectEditContainer type="category" onReset={timeSeriesInput.onReset}>
            <EditValueContainer label="Parent">
                <CategoryButton variant="outlined" color="inherit" {...parentButtonPopover.buttonProps}>
                    {getCategoryIcon(parent || PLACEHOLDER_CATEGORY, IconSx)}
                    <Typography variant="body1" noWrap={true}>
                        {parent?.name || "No Parent"}
                    </Typography>
                    <KeyboardArrowDown fontSize="small" htmlColor={Greys[600]} />
                </CategoryButton>
                <Menu {...parentButtonPopover.popoverProps} PaperProps={ParentPaperProps}>
                    <SingleCategoryMenu
                        selected={parent ? parent.id : PLACEHOLDER_CATEGORY_ID}
                        setSelected={handleChangeCategory}
                        exclude={[TRANSFER_CATEGORY_ID, working.id].concat(childCategoryIDs)}
                    />
                </Menu>
            </EditValueContainer>
            <EditValueContainer label="Colour" disabled={parent && "Child categories inherit their parent's colour"}>
                <ColourContainerBox sx={parent ? ColourContainerDisabledSx : undefined}>
                    <input type="color" value={getCategoryColour(working.id, working)} onChange={handleColorChange} />
                    <IconButton size="small" onClick={generateRandomColour}>
                        <Tooltip title="Get random colour">
                            <Sync />
                        </Tooltip>
                    </IconButton>
                </ColourContainerBox>
            </EditValueContainer>
            <EditTitleContainer title="Budget" />
            <EditValueContainer
                label="Type"
                disabled={parent ? "Child categories inherit their parent's budget" : undefined}
            >
                <BudgetTypeToggleButtonGroup
                    size="small"
                    value={working.budgets?.strategy || "none"}
                    exclusive={true}
                    onChange={updateBudgetStrategy}
                >
                    <BudgetTypeToggleButton value="none">
                        <Tooltip title="Do not budget this category">
                            <BudgetTypeToggleInnerBox>
                                <Clear fontSize="small" />
                                <Typography variant="caption">None</Typography>
                            </BudgetTypeToggleInnerBox>
                        </Tooltip>
                    </BudgetTypeToggleButton>
                    <BudgetTypeToggleButton value="base">
                        <Tooltip title="Set a constant budget each month">
                            <BudgetTypeToggleInnerBox>
                                <LooksOne fontSize="small" />
                                <Typography variant="caption">Constant</Typography>
                            </BudgetTypeToggleInnerBox>
                        </Tooltip>
                    </BudgetTypeToggleButton>
                    <BudgetTypeToggleButton value="copy">
                        <Tooltip title="Copy previous month's budget">
                            <BudgetTypeToggleInnerBox>
                                <FastForward fontSize="small" />
                                <Typography variant="caption">Copy</Typography>
                            </BudgetTypeToggleInnerBox>
                        </Tooltip>
                    </BudgetTypeToggleButton>
                    <BudgetTypeToggleButton value="rollover">
                        <Tooltip title="Roll over unused budget each month">
                            <BudgetTypeToggleInnerBox>
                                <Forward10 fontSize="small" />
                                <Typography variant="caption">Rollover</Typography>
                            </BudgetTypeToggleInnerBox>
                        </Tooltip>
                    </BudgetTypeToggleButton>
                </BudgetTypeToggleButtonGroup>
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
                {timeSeriesInput.component}
            </EditValueContainer>
        </ObjectEditContainer>
    );
};

const { update, remove, set, getWorkingCopy: getWorking } = getUpdateFunctions("category");
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

const updateMonthsBudgetFlipped = (index: number, value: number | null) => updateMonthsBudget(index, value && -value);
const updateMonthsBudget = (index: number, value: number | null) => {
    const current = getWorking().budgets?.values || BaseBudget;
    current[index] = value ?? 0;
    updateBudget({ values: current });
};
const updateBaseBudgetFlipped = (value: number | null) => updateBaseBudget(value && -value);
const updateBaseBudget = (value: number | null) => updateBudget({ base: value || 0 });

const useCategoryBudgetInput = (working: Category) => {
    const defaultCurrency = useDefaultCurrency().symbol;
    const useCategoryMouseoverText = useCallback(
        (value: number) => defaultCurrency + " " + formatNumber(value, { end: "k", maxDecimals: 1 }),
        [defaultCurrency]
    );

    const getOriginalBudget = useCallback(() => {
        const actual = TopHatStore.getState().data.category.entities[working.id];
        return actual?.budgets?.values;
    }, [working.id]);
    const getOriginalBase = useCallback(() => {
        const actual = TopHatStore.getState().data.category.entities[working.id];
        return actual?.budgets?.base;
    }, [working.id]);

    let budgets = working.budgets ? working.budgets.values : BaseBudget;
    let base = working.budgets?.base ?? null;
    let flipped = false;
    if (!budgets.some((x) => x > 0) && (base === null || base <= 0)) {
        flipped = true;
        budgets = budgets.map((x) => -x);
        if (base) base *= -1;
    }

    return useTimeSeriesInput({
        values: budgets,
        getOriginals: getOriginalBudget,
        update: flipped ? updateMonthsBudgetFlipped : updateMonthsBudget,
        secondary: {
            value: base,
            update: flipped ? updateBaseBudgetFlipped : updateBaseBudget,
            label: working.budgets?.strategy !== "rollover" ? "Monthly Budget" : "Monthly Increase",
            disabled: working.budgets?.strategy === "copy",
            getOriginal: getOriginalBase,
        },
        id: working.id + "-" + flipped,
        getMouseOverText: useCategoryMouseoverText,
    });
};

const ColourContainerBox = styled(Box)({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: 90,

    "& input": { width: 40, height: 40 },
});
const ColourContainerDisabledSx = { opacity: 0.3, pointerEvents: "none" as const };
const IconSx = {
    height: 24,
    width: 24,
    marginRight: 15,
    borderRadius: "5px",
    flexShrink: 0,
};
const CategoryButton = styled(Button)({
    width: 250,
    textTransform: "inherit",
    height: 40,

    "& > p": {
        flexGrow: 1,
        textAlign: "left",
    },

    "& > svg": {
        marginLeft: 15,
    },
});
const BudgetTypeToggleButtonGroup = styled(ToggleButtonGroup)({
    flexGrow: 1,
    "& > button": {
        flexGrow: 1,
        padding: 5,
    },
});
const BudgetTypeToggleButton = styled(ToggleButton)({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: 60,
});
const BudgetTypeToggleInnerBox = styled("div")({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
});
const ParentPaperProps = { sx: { width: 250, maxHeight: 300 } };
