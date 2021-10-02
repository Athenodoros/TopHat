import { DeleteTwoTone, Edit, KeyboardArrowDown, OpenInFullTwoTone, SwapHoriz } from "@mui/icons-material";
import { Button, Collapse, IconButton, TextField, Tooltip, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import React, { useCallback, useMemo, useState } from "react";
import { getCategoryIcon } from "../../../components/display/ObjectDisplay";
import { ObjectSelector } from "../../../components/inputs";
import { useNumericInputHandler } from "../../../shared/hooks";
import { TopHatDispatch } from "../../../state";
import { AppSlice } from "../../../state/app";
import { Category, DataSlice, PLACEHOLDER_CATEGORY_ID } from "../../../state/data";
import { useAllCategories } from "../../../state/data/hooks";
import { TRANSFER_CATEGORY_ID } from "../../../state/data/shared";
import { ID } from "../../../state/shared/values";
import { Greys } from "../../../styles/colours";
// import { NonIdealState } from "../../components/display/NonIdealState";

const useStyles = makeStyles({
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

export const CategoryBudgetTransferElements: React.FC<{ category: Category }> = ({ category }) => {
    const classes = useStyles();

    const [transfer, setTransfer] = useState(false);
    const openTransfer = useCallback(() => setTransfer(true), []);
    const closeTransfer = useCallback(() => setTransfer(false), []);
    const openEditView = useCallback(
        () => TopHatDispatch(AppSlice.actions.setDialogPartial({ id: "category", category })),
        [category]
    );

    return (
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
