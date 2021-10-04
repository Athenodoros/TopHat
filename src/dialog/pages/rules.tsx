import { CallSplit, KeyboardArrowDown } from "@mui/icons-material";
import { Autocomplete, Button, Checkbox, ListItemText, TextField, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import clsx from "clsx";
import { identity, inRange } from "lodash";
import React, { useCallback } from "react";
import { DropResult } from "react-beautiful-dnd";
import { NonIdealState } from "../../components/display/NonIdealState";
import { getCategoryIcon, useGetAccountIcon } from "../../components/display/ObjectDisplay";
import { ObjectSelector, SubItemCheckbox } from "../../components/inputs";
import { handleAutoCompleteChange, handleTextFieldChange } from "../../shared/events";
import { useNumericInputHandler } from "../../shared/hooks";
import { TopHatDispatch, TopHatStore } from "../../state";
import { useDialogHasWorking, useDialogState } from "../../state/app/hooks";
import { Account, DataSlice, Rule } from "../../state/data";
import { useAccountMap, useAllAccounts, useAllCategories, useCategoryByID } from "../../state/data/hooks";
import { getNextID, PLACEHOLDER_CATEGORY_ID } from "../../state/data/shared";
import { Greys } from "../../styles/colours";
import {
    DialogContents,
    DialogMain,
    DraggableDialogObjectSelector,
    EditTitleContainer,
    EditValueContainer,
    getUpdateFunctions,
    ObjectEditContainer,
} from "../shared";

const useMainStyles = makeStyles((theme) => ({
    base: {
        display: "flex",
        alignItems: "center",
        flexGrow: 1,
        height: 32,

        "& > div:first-child": {
            marginLeft: 10,
            color: Greys[500],
            width: 40,
            flexGrow: 0,
        },
    },
    disabled: {
        opacity: 0.5,
        fontStyle: "italic",
        transition: theme.transitions.create("opacity"),
        "&:hover": { opacity: 1 },
    },
}));

export const DialogRulesView: React.FC = () => {
    const classes = useMainStyles();
    const working = useDialogHasWorking();
    const render = useCallback(
        (rule: Rule) => (
            <div className={clsx(classes.base, rule.isInactive && classes.disabled)}>
                <ListItemText>{rule.index + "."}</ListItemText>
                <ListItemText>{rule.name}</ListItemText>
            </div>
        ),
        [classes]
    );

    return (
        <DialogMain onClick={remove}>
            <DraggableDialogObjectSelector
                type="rule"
                createDefaultOption={createNewRule}
                render={render}
                onDragEnd={onDragEnd}
            />
            <DialogContents>
                {working ? (
                    <EditRuleView />
                ) : (
                    <NonIdealState
                        icon={CallSplit}
                        title="Rules"
                        subtitle="Rules can be set up to automatically categorise and modify transactions as they are added from statements."
                    />
                )}
            </DialogContents>
        </DialogMain>
    );
};

const createNewRule = (): Rule => {
    const id = getNextID(TopHatStore.getState().data.rule.ids);
    return {
        id,
        name: "New Rule",
        index: id,
        isInactive: false,
        reference: [],
        regex: false,
        accounts: [],
        min: null,
        max: null,
        category: PLACEHOLDER_CATEGORY_ID,
    };
};

const onDragEnd = ({ source, destination, reason, draggableId }: DropResult) => {
    if (reason !== "DROP" || destination === undefined) return;

    const { ids, entities } = TopHatStore.getState().data.rule;

    const rangeMin = Math.min(source.index, destination.index);
    const rangeMax = Math.max(source.index, destination.index);
    const updates = ids
        .filter((id) => inRange(entities[id]!.index, rangeMin, rangeMax + 1) && entities[id]!.index !== source.index)
        .map((id) => ({
            id,
            changes: {
                index: entities[id]!.index + (source.index > destination.index ? 1 : -1),
            },
        }))
        .concat([{ id: Number(draggableId), changes: { index: destination.index } }]);

    TopHatDispatch(DataSlice.actions.updateSimpleObjects({ type: "rule", updates }));
};

const useEditViewStyles = makeStyles((theme) => ({
    inactive: {
        alignSelf: "flex-end",
    },
    icon: {
        width: 20,
        height: 20,
        marginRight: 15,
    },
    grow: { flexGrow: 1 },
    accountIcon: {
        width: 16,
        height: 16,
        borderRadius: 4,
        marginRight: 8,
    },
    category: {
        width: 200,
        textTransform: "inherit",
        height: 40,

        "& > p": {
            flexGrow: 1,
            textAlign: "left",
        },

        "& > svg": {
            marginLeft: 15,
        },
    },
    placeholder: {
        opacity: 0.5,
        fontStyle: "italic",
        transition: theme.transitions.create("opacity"),
        "&:hover": { opacity: 1 },
    },
    range: {
        display: "flex",
        flexGrow: 1,
        justifyContent: "space-between",

        "& > :first-child": {
            marginRight: 30,
        },
    },
}));
const EditRuleView: React.FC = () => {
    const classes = useEditViewStyles();
    const working = useDialogState("rule")!;
    const category = useCategoryByID(working.category);
    const categories = useAllCategories();

    const min = useNumericInputHandler(working.min ?? null, updateWorkingMin, working.id);
    const max = useNumericInputHandler(working.max ?? null, updateWorkingMax, working.id);

    const getAccountIcon = useGetAccountIcon();
    const accounts = useAllAccounts();
    const accountMap = useAccountMap();

    // These dummies are to help ESLint work out the dependencies of the callback
    const setMinValue = min.setValue;
    const setMaxValue = max.setValue;
    const onReset = useCallback(() => {
        const actual = TopHatStore.getState().data.rule.entities[working.id];
        if (actual) {
            setMinValue(actual.min);
            setMaxValue(actual.max);
        }
    }, [setMinValue, setMaxValue, working.id]);

    return (
        <ObjectEditContainer
            type="rule"
            subtitle={
                <SubItemCheckbox
                    label="Inactive Rule"
                    checked={working.isInactive}
                    setChecked={updateWorkingIsInactive}
                    className={classes.inactive}
                />
            }
            onReset={onReset}
        >
            <EditTitleContainer title="Conditions" />
            <EditValueContainer label="Reference">
                <div className={classes.grow}>
                    <Autocomplete
                        limitTags={1}
                        multiple={true}
                        options={[] as string[]}
                        getOptionLabel={identity}
                        value={working.reference}
                        onChange={updateWorkingReferenceAuto}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Transaction Reference"
                                size="small"
                                onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
                                    if (event.key === "Enter") {
                                        updateWorkingReference(
                                            working.reference.concat([(event.target as HTMLInputElement).value])
                                        );
                                        (event.target as HTMLInputElement).value = "";
                                    }
                                }}
                            />
                        )}
                        open={false}
                    />
                    <SubItemCheckbox
                        label="As Regex"
                        checked={working.regex}
                        setChecked={updateWorkingRegex}
                        left={true}
                    />
                </div>
            </EditValueContainer>
            <EditValueContainer label="Value">
                <div className={classes.range}>
                    <TextField value={min.text} onChange={min.onTextChange} size="small" label="Minimum" />
                    <TextField value={max.text} onChange={max.onTextChange} size="small" label="Maximum" />
                </div>
            </EditValueContainer>
            <EditValueContainer label="Accounts">
                <Autocomplete
                    className={classes.grow}
                    limitTags={1}
                    multiple={true}
                    options={accounts}
                    getOptionLabel={(option) => option.name}
                    value={working.accounts.map((id) => accountMap[id]!)}
                    autoHighlight={true}
                    onChange={updateWorkingAccounts}
                    renderOption={(props, account) => (
                        <li {...props}>
                            {getAccountIcon(account, classes.accountIcon)}
                            <Typography variant="body1" className={classes.grow}>
                                {account.name}
                            </Typography>
                            <Checkbox size="small" color="primary" checked={working.accounts.includes(account.id)} />
                        </li>
                    )}
                    renderInput={(params) => <TextField {...params} label="Included Accounts" size="small" />}
                />
            </EditValueContainer>
            <EditTitleContainer title="Updated Values" />
            <EditValueContainer label="Summary">
                <TextField
                    value={working.summary || ""}
                    onChange={updateWorkingSummary}
                    size="small"
                    label="New Summary Text"
                />
            </EditValueContainer>
            <EditValueContainer label="Description">
                <TextField
                    value={working.description || ""}
                    onChange={updateWorkingDescription}
                    size="small"
                    label="New Description Text"
                    style={{ width: "100%" }}
                    multiline={true}
                />
            </EditValueContainer>
            <EditValueContainer label="Category">
                <ObjectSelector
                    options={categories}
                    render={(category) => getCategoryIcon(category, classes.icon)}
                    selected={working.category}
                    setSelected={updateWorkingCategory}
                >
                    <Button variant="outlined" className={classes.category} color="inherit">
                        {getCategoryIcon(category, classes.icon)}
                        <Typography variant="body1">{category.name}</Typography>
                        <KeyboardArrowDown fontSize="small" htmlColor={Greys[600]} />
                    </Button>
                </ObjectSelector>
            </EditValueContainer>
        </ObjectEditContainer>
    );
};

const { update, remove } = getUpdateFunctions("rule");
const updateWorkingIsInactive = update("isInactive");
const updateWorkingReference = update("reference");
const updateWorkingReferenceAuto = handleAutoCompleteChange(updateWorkingReference);
const updateWorkingRegex = update("regex");
const updateWorkingMin = update("min");
const updateWorkingMax = update("max");
const updateWorkingAccounts = handleAutoCompleteChange((accounts: Account[]) =>
    update("accounts")(accounts.map(({ id }) => id))
);
const updateWorkingSummary = handleTextFieldChange(update("summary"));
const updateWorkingDescription = handleTextFieldChange(update("description"));
const updateWorkingCategory = update("category");