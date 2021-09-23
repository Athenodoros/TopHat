import { Button, ListItemText, makeStyles, TextField, Typography } from "@material-ui/core";
import { AccountBalanceWallet, Event, KeyboardArrowDown } from "@material-ui/icons";
import { ToggleButton, ToggleButtonGroup } from "@material-ui/lab";
import { KeyboardDatePicker } from "@material-ui/pickers";
import { MaterialUiPickersDate } from "@material-ui/pickers/typings/date";
import clsx from "clsx";
import { DateTime } from "luxon";
import React, { useCallback } from "react";
import { TopHatStore } from "../../../state";
import { useDialogHasWorking, useDialogState } from "../../../state/app/hooks";
import { Account } from "../../../state/data";
import { useAllInstitutions, useInstitutionByID } from "../../../state/data/hooks";
import { AccountTypes } from "../../../state/data/types";
import { getNextID, PLACEHOLDER_INSTITUTION_ID } from "../../../state/data/utilities";
import { BaseTransactionHistory, formatDate, getTodayString } from "../../../state/utilities/values";
import { Greys } from "../../../styles/colours";
import { handleButtonGroupChange, handleTextFieldChange } from "../../../utilities/events";
import { NonIdealState } from "../../display/NonIdealState";
import { getInstitutionIcon, useGetAccountIcon } from "../../display/ObjectDisplay";
import { ObjectSelector, SubItemCheckbox } from "../../inputs";
import {
    BasicDialogObjectSelector,
    DialogContents,
    DialogMain,
    EditValueContainer,
    getUpdateFunctions,
    ObjectEditContainer,
} from "../utilities";

const useMainStyles = makeStyles((theme) => ({
    base: {
        display: "flex",
        alignItems: "center",
    },
    disabled: {
        opacity: 0.5,
        fontStyle: "italic",
        transition: theme.transitions.create("opacity"),
        "&:hover": { opacity: 1 },
    },
    icon: {
        height: 24,
        width: 24,
        marginRight: 15,
        borderRadius: 5,
    },
}));

export const DialogAccountsView: React.FC = () => {
    const classes = useMainStyles();
    const getAccountIcon = useGetAccountIcon();
    const working = useDialogHasWorking();
    const render = useCallback(
        (account: Account) => (
            <div className={clsx(classes.base, account.isInactive && classes.disabled)}>
                {getAccountIcon(account, classes.icon)}
                <ListItemText>{account.name}</ListItemText>
            </div>
        ),
        [classes, getAccountIcon]
    );

    return (
        <DialogMain onClick={remove}>
            <BasicDialogObjectSelector type="account" createDefaultOption={createNewAccount} render={render} />
            <DialogContents>
                {working ? (
                    <EditAccountView />
                ) : (
                    <NonIdealState
                        icon={AccountBalanceWallet}
                        title="Accounts"
                        subtitle="Accounts are transaction or investment accounts, or assets to be tracked. They can have multiple currencies, and will track their balances in each."
                    />
                )}
            </DialogContents>
        </DialogMain>
    );
};

export const createNewAccount = () => ({
    id: getNextID(TopHatStore.getState().data.account.ids),
    name: "New Account",
    isInactive: false,
    category: 1 as const,
    institution: PLACEHOLDER_INSTITUTION_ID,
    openDate: getTodayString(),
    lastUpdate: getTodayString(),
    balances: {},
    transactions: BaseTransactionHistory(),
});

const useEditViewStyles = makeStyles({
    icon: {
        height: 24,
        width: 24,
        marginRight: 15,
        borderRadius: 5,
    },
    institution: {
        textTransform: "inherit",
        height: 40,

        "& .MuiButton-label > svg:last-child": {
            marginLeft: 15,
        },
    },
    dates: {
        display: "flex",
        flexGrow: 1,
        justifyContent: "space-between",
        marginTop: 5,

        "& > :first-child": {
            marginRight: 30,
        },
    },
    toggles: {
        flexGrow: 1,
        "& > button": {
            flexGrow: 1,
        },
    },
    toggle: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: 85,
    },
    inactive: {
        alignSelf: "flex-end",
    },
});

const EditAccountView: React.FC = () => {
    const classes = useEditViewStyles();
    const working = useDialogState("account")!;
    const institution = useInstitutionByID(working.institution);
    const institutions = useAllInstitutions();

    return (
        <ObjectEditContainer
            type="account"
            subtitle={
                <SubItemCheckbox
                    label="Inactive Account"
                    checked={working.isInactive}
                    setChecked={updateWorkingIsInactive}
                    className={classes.inactive}
                />
            }
        >
            <EditValueContainer label="Institution">
                <ObjectSelector
                    options={institutions}
                    render={(institution) => getInstitutionIcon(institution, classes.icon)}
                    selected={working.institution}
                    setSelected={updateWorkingInstitution}
                >
                    <Button variant="outlined" className={classes.institution}>
                        {getInstitutionIcon(institution!, classes.icon)}
                        <Typography variant="body1" noWrap={true}>
                            {institution.name}
                        </Typography>
                        <KeyboardArrowDown fontSize="small" htmlColor={Greys[600]} />
                    </Button>
                </ObjectSelector>
            </EditValueContainer>
            <EditValueContainer label="Account Type">
                <ToggleButtonGroup
                    size="small"
                    value={working.category}
                    exclusive={true}
                    onChange={updateWorkingCategory}
                    className={classes.toggles}
                >
                    {AccountTypes.map((typ) => (
                        <ToggleButton key={typ.id} value={typ.id} classes={{ label: classes.toggle }}>
                            {React.createElement(typ.icon, { fontSize: "small" })}
                            <Typography variant="caption">{typ.short}</Typography>
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </EditValueContainer>
            <EditValueContainer label="Website">
                <TextField
                    variant="outlined"
                    value={working.website || ""}
                    onChange={updateWorkingWebsite}
                    size="small"
                    style={{ width: "100%" }}
                    placeholder="Account website, usually for internet banking"
                />
            </EditValueContainer>
            <EditValueContainer label="Dates">
                <div className={classes.dates}>
                    <KeyboardDatePicker
                        value={working.openDate}
                        onChange={updateWorkingOpenDate}
                        disableFuture={true}
                        format="yyyy-MM-dd"
                        inputVariant="outlined"
                        size="small"
                        label="Open Date"
                        KeyboardButtonProps={{ size: "small" }}
                        keyboardIcon={<Event fontSize="small" />}
                        clearable={true}
                    />
                    <KeyboardDatePicker
                        value={working.lastUpdate}
                        onChange={updateWorkingUpdateDate}
                        format="yyyy-MM-dd"
                        inputVariant="outlined"
                        size="small"
                        label={working.isInactive ? "Inactive Since" : "Last Update"}
                        KeyboardButtonProps={{ size: "small" }}
                        keyboardIcon={<Event fontSize="small" />}
                        clearable={true}
                    />
                </div>
            </EditValueContainer>
            <EditValueContainer label="Statements">
                <TextField
                    variant="outlined"
                    value={working.statementFilePatternManual || ""}
                    onChange={updateWorkingFilePattern}
                    size="small"
                    style={{ width: "100%" }}
                    placeholder={working.statementFilePattern}
                />
            </EditValueContainer>
        </ObjectEditContainer>
    );
};

const { update, remove } = getUpdateFunctions("account");
const updateWorkingIsInactive = update("isInactive");
const updateWorkingInstitution = update("institution");
const updateWorkingWebsite = handleTextFieldChange(update("website"));
const updateWorkingCategory = handleButtonGroupChange(update("category"));
const updateWorkingOpenDate = (date: MaterialUiPickersDate) => update("openDate")(formatDate(date as DateTime));
const updateWorkingUpdateDate = (date: MaterialUiPickersDate) => update("lastUpdate")(formatDate(date as DateTime));
const updateWorkingFilePattern = handleTextFieldChange(update("statementFilePatternManual"));
