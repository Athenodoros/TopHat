import styled from "@emotion/styled";
import { DeleteTwoTone, Edit, KeyboardArrowDown, OpenInFullTwoTone, SwapHoriz } from "@mui/icons-material";
import { Button, Collapse, collapseClasses, IconButton, TextField, Tooltip, Typography } from "@mui/material";
import { Box } from "@mui/system";
import React, { useCallback, useMemo, useState } from "react";
import { getCategoryIconSx } from "../../../components/display/ObjectDisplay";
import { ObjectSelector } from "../../../components/inputs";
import { useNumericInputHandler } from "../../../shared/hooks";
import { TopHatDispatch } from "../../../state";
import { AppSlice } from "../../../state/app";
import { Category, DataSlice, PLACEHOLDER_CATEGORY_ID } from "../../../state/data";
import { useAllCategories } from "../../../state/data/hooks";
import { TRANSFER_CATEGORY_ID } from "../../../state/data/shared";
import { ID } from "../../../state/shared/values";
import { Greys } from "../../../styles/colours";

export const CategoryBudgetTransferElements: React.FC<{ category: Category }> = ({ category }) => {
    const [transfer, setTransfer] = useState(false);
    const openTransfer = useCallback(() => setTransfer(true), []);
    const closeTransfer = useCallback(() => setTransfer(false), []);
    const openEditView = useCallback(
        () => TopHatDispatch(AppSlice.actions.setDialogPartial({ id: "category", category })),
        [category]
    );

    return (
        <ActionsBox>
            <Collapse in={!transfer} orientation="horizontal">
                <EditButton color="warning" startIcon={<Edit />} onClick={openEditView}>
                    EDIT
                </EditButton>
                <Button variant="outlined" startIcon={<SwapHoriz />} onClick={openTransfer}>
                    TRANSFER
                </Button>
            </Collapse>
            <Collapse in={transfer} orientation="horizontal">
                <BudgetTransferElements category={category} close={closeTransfer} />
            </Collapse>
        </ActionsBox>
    );
};

const ActionsBox = styled(Box)({
    display: "flex",
    justifyContent: "flex-end",

    [`& .${collapseClasses.wrapperInner}`]: {
        display: "flex",
        alignItems: "center",
    },
});
const EditButton = styled(Button)({ marginRight: 15, padding: "6px 12px" });

const BudgetTransferElements: React.FC<{ category: Category; close: () => void }> = ({ category, close }) => {
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
                render={(category) => getCategoryIconSx(category, IconSx)}
                selected={selected.id}
                setSelected={setSelectedCategory}
            >
                <CategoryButton variant="outlined" color="inherit">
                    {getCategoryIconSx(selected, IconSx)}
                    <Typography variant="body1" noWrap={true}>
                        {selected.name}
                    </Typography>
                    <KeyboardArrowDown fontSize="small" htmlColor={Greys[600]} />
                </CategoryButton>
            </ObjectSelector>
            <InputTextField
                value={numericInputHander.text}
                onChange={numericInputHander.onTextChange}
                size="small"
                label="Value"
            />
            <BudgetActionsBox>
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
            </BudgetActionsBox>
        </>
    );
};

const CategoryButton = styled(Button)({
    textTransform: "inherit",
    height: 40,
    flex: "1 1 160px",

    "& > p": {
        flexGrow: 1,
        textAlign: "left",
        marginLeft: 10,
    },
    "& > svg": {
        marginLeft: 15,
    },
});
const IconSx = { width: 16, height: 16 };
const InputTextField = styled(TextField)({ margin: "0 10px", flex: "1 1 100px" });
const BudgetActionsBox = styled(Box)({
    display: "flex",
    "& button:not(:last-child)": {
        marginRight: 6,
    },
});
