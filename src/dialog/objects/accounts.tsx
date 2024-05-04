import styled from "@emotion/styled";
import { AccountBalanceWallet, KeyboardArrowDown } from "@mui/icons-material";
import { Button, ListItemText, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { Box } from "@mui/system";
import React, { useCallback } from "react";
import { NonIdealState } from "../../components/display/NonIdealState";
import { getInstitutionIcon, useGetAccountIcon } from "../../components/display/ObjectDisplay";
import { ManagedDatePicker, ObjectSelector, SubItemCheckbox } from "../../components/inputs";
import { handleButtonGroupChange, handleTextFieldChange } from "../../shared/events";
import { TopHatStore } from "../../state";
import { useDialogHasWorking, useDialogState } from "../../state/app/hooks";
import { Account } from "../../state/data";
import { useAllInstitutions, useInstitutionByID } from "../../state/data/hooks";
import { PLACEHOLDER_INSTITUTION_ID, getNextID } from "../../state/data/shared";
import { AccountTypes } from "../../state/data/types";
import { BaseTransactionHistory, getTodayString, parseDate } from "../../state/shared/values";
import { Greys } from "../../styles/colours";
import { getThemeTransition } from "../../styles/theme";
import { DialogContents, DialogMain, EditValueContainer } from "../shared";
import { BasicDialogObjectSelector, ObjectEditContainer, getUpdateFunctions } from "./shared";

export const DialogAccountsView: React.FC = () => {
    const getAccountIcon = useGetAccountIcon();
    const working = useDialogHasWorking();
    const render = useCallback(
        (account: Account) => (
            <AccountBox sx={account.isInactive ? DisabledAccountSx : undefined}>
                {getAccountIcon(account, AccountIconSx)}
                <ListItemText>{account.name}</ListItemText>
            </AccountBox>
        ),
        [getAccountIcon]
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

const AccountBox = styled(Box)({ display: "flex", alignItems: "center", height: 32 });
const DisabledAccountSx = {
    opacity: 0.5,
    fontStyle: "italic",
    "&:hover": { opacity: 1 },
    transition: getThemeTransition("opacity"),
};
const AccountIconSx = {
    height: 24,
    width: 24,
    marginRight: 15,
    borderRadius: "5px",
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

const EditAccountView: React.FC = () => {
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
                    sx={InactiveCheckboxSx}
                />
            }
        >
            <EditValueContainer label="Institution">
                <ObjectSelector
                    options={institutions}
                    render={(institution) => getInstitutionIcon(institution, AccountIconSx)}
                    selected={working.institution}
                    setSelected={updateWorkingInstitution}
                >
                    <InstitutionButton variant="outlined" color="inherit">
                        {getInstitutionIcon(institution!, AccountIconSx)}
                        <Typography variant="body1" noWrap={true}>
                            {institution.name}
                        </Typography>
                        <KeyboardArrowDown fontSize="small" htmlColor={Greys[600]} />
                    </InstitutionButton>
                </ObjectSelector>
            </EditValueContainer>
            <EditValueContainer label="Account Type">
                <AccountTypeToggleButtonGroup
                    size="small"
                    value={working.category}
                    exclusive={true}
                    onChange={updateWorkingCategory}
                >
                    {AccountTypes.map((typ) => (
                        <AccountTypeToggleButton key={typ.id} value={typ.id}>
                            {React.createElement(typ.icon, { fontSize: "small" })}
                            <Typography variant="caption">{typ.short}</Typography>
                        </AccountTypeToggleButton>
                    ))}
                </AccountTypeToggleButtonGroup>
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
                <DatesBox>
                    <ManagedDatePicker
                        value={working.openDate}
                        onChange={updateWorkingOpenDate}
                        nullable={false}
                        disableOpenPicker={true}
                        disableFuture={true}
                        maxDate={parseDate(working.lastUpdate)}
                        slotProps={{ textField: { size: "small", label: "Open Date" } }}
                    />
                    <ManagedDatePicker
                        value={working.lastUpdate}
                        onChange={updateWorkingUpdateDate}
                        nullable={false}
                        disableOpenPicker={true}
                        slotProps={{
                            textField: { size: "small", label: working.isInactive ? "Inactive Since" : "Last Update" },
                        }}
                    />
                </DatesBox>
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
const updateWorkingOpenDate = update("openDate");
const updateWorkingUpdateDate = update("lastUpdate");
const updateWorkingFilePattern = handleTextFieldChange(update("statementFilePatternManual"));

const InstitutionButton = styled(Button)({
    textTransform: "inherit",
    height: 40,

    "& > svg": { marginLeft: 15 },
});
const DatesBox = styled("div")({
    display: "flex",
    flexGrow: 1,
    justifyContent: "space-between",
    marginTop: 5,

    "& > :first-of-type": { marginRight: 30 },
});
const AccountTypeToggleButtonGroup = styled(ToggleButtonGroup)({
    flexGrow: 1,
    "& > button": { flexGrow: 1 },
});
const AccountTypeToggleButton = styled(ToggleButton)({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: 85,
});
const InactiveCheckboxSx = { alignSelf: "flex-end" };
