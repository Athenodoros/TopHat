import { IconButton, ListItemText, makeStyles, Tooltip } from "@material-ui/core";
import { ShoppingBasket, Sync } from "@material-ui/icons";
import React, { useCallback } from "react";
import { TopHatStore } from "../../../state";
import { useDialogState } from "../../../state/app/hooks";
import { Category } from "../../../state/data";
import { getNextID, PLACEHOLDER_CATEGORY_ID, TRANSFER_CATEGORY_ID } from "../../../state/data/utilities";
import { BaseTransactionHistory, getRandomColour } from "../../../state/utilities/values";
import { getCategoryIcon } from "../../display/ObjectDisplay";
import { DialogObjectEditWrapper, EditValueContainer, getUpdateFunctions, ObjectEditContainer } from "../utilities";

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
    const render = useCallback(
        (category: Category) => (
            <div className={classes.base}>
                {getCategoryIcon(category, classes.icon)}
                <ListItemText>{category.name}</ListItemText>
            </div>
        ),
        [classes]
    );

    return (
        <DialogObjectEditWrapper
            type="category"
            createDefaultOption={createNewCategory}
            render={render}
            placeholder={Placeholder}
            exclude={[PLACEHOLDER_CATEGORY_ID, TRANSFER_CATEGORY_ID]}
        >
            <EditCategoryView />
        </DialogObjectEditWrapper>
    );
};

const Placeholder = {
    icon: ShoppingBasket,
    title: "Categories",
    subtext:
        "Categories are a way to break down income and expenses into manageable chunks for tracking and budgeting.",
};
const createNewCategory = (): Category => ({
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
        marginLeft: 80,
        width: 90,

        "& input": { width: 50, height: 50 },
    },
});
const EditCategoryView: React.FC = () => {
    const classes = useEditViewStyles();
    const working = useDialogState("category")!;

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

const { update } = getUpdateFunctions("category");
const handleColorChange: React.ChangeEventHandler<HTMLInputElement> = (event) => update("colour")(event.target.value);
const generateRandomColour = () => update("colour")(getRandomColour());
