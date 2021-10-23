import { AccountBalanceWallet, KeyboardArrowDown } from "@mui/icons-material";
import { DatePickerProps } from "@mui/lab";
import { Button, ListItemText, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import clsx from "clsx";
import { DateTime } from "luxon";
import React, { useCallback } from "react";
import { NonIdealState } from "../../components/display/NonIdealState";
import { getInstitutionIcon, useGetAccountIcon } from "../../components/display/ObjectDisplay";
import { AutoClosingDatePicker, ObjectSelector, SubItemCheckbox } from "../../components/inputs";
import { handleButtonGroupChange, handleTextFieldChange } from "../../shared/events";
import { TopHatStore } from "../../state";
import { useDialogHasWorking, useDialogState } from "../../state/app/hooks";
import { Account } from "../../state/data";
import { useAllInstitutions, useInstitutionByID } from "../../state/data/hooks";
import { getNextID, PLACEHOLDER_INSTITUTION_ID } from "../../state/data/shared";
import { AccountTypes } from "../../state/data/types";
import { BaseTransactionHistory, formatDate, getTodayString } from "../../state/shared/values";
import { Greys } from "../../styles/colours";
import {
    BasicDialogObjectSelector,
    DialogContents,
    DialogMain,
    EditValueContainer,
    getUpdateFunctions,
    ObjectEditContainer,
} from "../shared";

const useMainStyles = makeStyles((theme) => ({
    base: {
        display: "flex",
        alignItems: "center",
        height: 32,
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

        "& > svg": {
            marginLeft: 15,
        },
    },
    dates: {
        display: "flex",
        flexGrow: 1,
        justifyContent: "space-between",
        marginTop: 5,

        "& > :first-of-type": {
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
                    <Button variant="outlined" className={classes.institution} color="inherit">
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
                        <ToggleButton key={typ.id} value={typ.id} classes={{ root: classes.toggle }}>
                            {React.createElement(typ.icon, { fontSize: "small" })}
                            <Typography variant="caption">{typ.short}</Typography>
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </EditValueContainer>
            <EditValueContainer label="Website">
                <TextField
                    value={working.website || ""}
                    onChange={updateWorkingWebsite}
                    size="small"
                    style={{ width: "100%" }}
                    placeholder="Account website, usually for internet banking"
                />
            </EditValueContainer>
            <EditValueContainer label="Dates">
                <div className={classes.dates}>
                    <AutoClosingDatePicker
                        value={working.openDate}
                        onChange={updateWorkingOpenDate as DatePickerProps["onChange"]}
                        disableFuture={true}
                        inputFormat="yyyy-MM-dd"
                        clearable={true}
                        renderInput={(params) => <TextField {...params} size="small" label="Open Date" />}
                    />
                    <AutoClosingDatePicker
                        value={working.lastUpdate}
                        onChange={updateWorkingUpdateDate as DatePickerProps["onChange"]}
                        inputFormat="yyyy-MM-dd"
                        clearable={true}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                size="small"
                                label={working.isInactive ? "Inactive Since" : "Last Update"}
                            />
                        )}
                    />
                </div>
            </EditValueContainer>
            <EditValueContainer label="Statements">
                <TextField
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
const updateWorkingOpenDate = (date: DateTime) => update("openDate")(formatDate(date));
const updateWorkingUpdateDate = (date: DateTime) => update("lastUpdate")(formatDate(date));
const updateWorkingFilePattern = handleTextFieldChange(update("statementFilePatternManual"));
