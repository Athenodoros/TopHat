import { IconButton, ListItemText, makeStyles, Tooltip } from "@material-ui/core";
import { ShoppingBasket, Sync } from "@material-ui/icons";
import React from "react";
import { TopHatStore } from "../../../state";
import { useDialogState } from "../../../state/app/hooks";
import { Category } from "../../../state/data";
import { useAllCategories } from "../../../state/data/hooks";
import { getNextID, PLACEHOLDER_CATEGORY_ID, TRANSFER_CATEGORY_ID } from "../../../state/data/utilities";
import { BaseTransactionHistory, getRandomColour } from "../../../state/utilities/values";
import { getCategoryIcon } from "../../display/ObjectDisplay";
import {
    DialogContents,
    DialogMain,
    DialogObjectSelector,
    DialogPlaceholderDisplay,
    EditValueContainer,
    getUpdateFunctions,
    ObjectEditContainer,
} from "../utilities";

const useMainStyles = makeStyles({
    base: {
        display: "flex",
        alignItems: "center",
    },
    icon: {
        height: 16,
        width: 16,
        marginLeft: 10,
        marginRight: 10,
        borderRadius: "50%",
    },
});

export const DialogCategoriesView: React.FC = () => {
    const classes = useMainStyles();

    const working = useDialogState("category");
    const Categories = useAllCategories().filter(
        ({ id }) => id !== PLACEHOLDER_CATEGORY_ID && id !== TRANSFER_CATEGORY_ID
    );

    const render = (category: Category) => (
        <div className={classes.base}>
            {getCategoryIcon(category, classes.icon)}
            <ListItemText>{category.name}</ListItemText>
        </div>
    );

    return (
        <DialogMain onClick={removeWorkingCategory}>
            <DialogObjectSelector
                type="category"
                options={Categories}
                createDefaultOption={createNewCategory}
                render={render}
            />
            <DialogContents>
                {working ? (
                    <EditCategoryView working={working} />
                ) : (
                    <DialogPlaceholderDisplay
                        icon={ShoppingBasket}
                        title="Categories"
                        subtext="Categories are a way to break down income and expenses into manageable ch
                        unks for tracking and budgeting."
                    />
                )}
            </DialogContents>
        </DialogMain>
    );
};

const { remove: removeWorkingCategory, update: updateCategoryPartial } = getUpdateFunctions("category");
const createNewCategory = (): Category => ({
    id: getNextID(TopHatStore.getState().data.category.ids),
    name: "New Category",
    colour: getRandomColour(),
    transactions: BaseTransactionHistory(),
});

const useEditViewStyles = makeStyles({
    colourContainer: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginLeft: 80,
        width: 90,

        "& input": { width: 50, height: 50 },
    },
});
const EditCategoryView: React.FC<{ working: Category }> = ({ working }) => {
    const classes = useEditViewStyles();

    return (
        <ObjectEditContainer type="category">
            <EditValueContainer label="Colour">
                <div className={classes.colourContainer}>
                    <input type="color" value={working.colour} onChange={handleColorChange} />
                    <IconButton size="small" onClick={generateRandomColour}>
                        <Tooltip title="Get random colour">
                            <Sync />
                        </Tooltip>
                    </IconButton>
                </div>
            </EditValueContainer>
        </ObjectEditContainer>
    );
};

const handleColorChange: React.ChangeEventHandler<HTMLInputElement> = (event) =>
    updateCategoryPartial("colour")(event.target.value);
const generateRandomColour = () => updateCategoryPartial("colour")(getRandomColour());
