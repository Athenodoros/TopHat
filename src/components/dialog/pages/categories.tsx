import { Button, IconButton, List, makeStyles, Tooltip, Typography } from "@material-ui/core";
import { KeyboardArrowDown, ShoppingBasket, Sync } from "@material-ui/icons";
import clsx from "clsx";
import React, { useMemo } from "react";
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
import { BaseTransactionHistory, getRandomColour, ID } from "../../../state/utilities/values";
import { Greys } from "../../../styles/colours";
import { SingleCategoryMenu } from "../../display/CategoryMenu";
import { getCategoryIcon } from "../../display/ObjectDisplay";
import { ObjectSelector } from "../../inputs";
import {
    DialogContents,
    DialogMain,
    DialogOptions,
    DialogPlaceholderDisplay,
    DialogSelectorAddNewButton,
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
                    <DialogPlaceholderDisplay
                        icon={ShoppingBasket}
                        title="Categories"
                        subtext="Categories are a way to break down income and expenses into manageable chunks for tracking and budgeting."
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

        "& input": { width: 50, height: 50 },
    },
    colourContainerDisabled: { "& input": { opacity: 0.3 } },
    icon: {
        height: 24,
        width: 24,
        marginRight: 15,
        borderRadius: 5,
    },
    category: {
        textTransform: "inherit",
        height: 40,

        "& .MuiButton-label > svg:last-child": {
            marginLeft: 15,
        },
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

    return (
        <ObjectEditContainer type="category">
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
            <EditValueContainer label="Colour">
                <Tooltip title={parent ? "Child categories inherit their parent's colour" : ""}>
                    <div className={clsx(classes.colourContainer, parent && classes.colourContainerDisabled)}>
                        <input
                            type="color"
                            value={getCategoryColour(working.id, working)}
                            onChange={handleColorChange}
                            disabled={!!parent}
                        />
                        <IconButton size="small" onClick={generateRandomColour} disabled={!!parent}>
                            <Tooltip title="Get random colour">
                                <Sync />
                            </Tooltip>
                        </IconButton>
                    </div>
                </Tooltip>
            </EditValueContainer>
        </ObjectEditContainer>
    );
};

const { update, remove, set } = getUpdateFunctions("category");
const handleColorChange: React.ChangeEventHandler<HTMLInputElement> = (event) => update("colour")(event.target.value);
const generateRandomColour = () => update("colour")(getRandomColour());
const updateWorkingParent = (id?: ID) => {
    update("hierarchy")(
        id === undefined ? [] : [id].concat(TopHatStore.getState().data.category.entities[id]!.hierarchy ?? [])
    );
};
