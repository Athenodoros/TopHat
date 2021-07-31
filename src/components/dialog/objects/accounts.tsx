import { Button, ListItemText, makeStyles, TextField, Typography } from "@material-ui/core";
import { AccountBalanceWallet, Event, KeyboardArrowDown } from "@material-ui/icons";
import { ToggleButton, ToggleButtonGroup } from "@material-ui/lab";
import { KeyboardDatePicker } from "@material-ui/pickers";
import { MaterialUiPickersDate } from "@material-ui/pickers/typings/date";
import clsx from "clsx";
import { DateTime } from "luxon";
import React from "react";
import { TopHatStore } from "../../../state";
import { useDialogState } from "../../../state/app/hooks";
import { Account } from "../../../state/data";
import { useAllAccounts, useAllInstitutions, useInstitutionByID } from "../../../state/data/hooks";
import { AccountTypes } from "../../../state/data/types";
import { getNextID, PLACEHOLDER_INSTITUTION_ID } from "../../../state/data/utilities";
import { BaseTransactionHistory, formatDate, getTodayString } from "../../../state/utilities/values";
import { Greys } from "../../../styles/colours";
import { handleButtonGroupChange, handleTextFieldChange } from "../../../utilities/events";
import { getInstitutionIcon, useGetAccountIcon } from "../../display/ObjectDisplay";
import { ObjectSelector, SubItemCheckbox } from "../../inputs";
import {
    DialogContents,
    DialogMain,
    DialogObjectSelector,
    DialogPlaceholderDisplay,
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

    const working = useDialogState("account");
    const accounts = useAllAccounts();

    const render = (account: Account) => (
        <div className={clsx(classes.base, account.isInactive && classes.disabled)}>
            {getAccountIcon(account, classes.icon)}
            <ListItemText>{account.name}</ListItemText>
        </div>
    );

    return (
        <DialogMain onClick={removeWorkingAccount}>
            <DialogObjectSelector
                type="account"
                options={accounts}
                createDefaultOption={createNewAccount}
                render={render}
            />
            <DialogContents>
                {working ? (
                    <EditAccountView working={working} />
                ) : (
                    <DialogPlaceholderDisplay
                        icon={AccountBalanceWallet}
                        title="Accounts"
                        subtext="Accounts are transaction or investment accounts, or assets to be tracked. They can have
                    multiple currencies, and will track their balances in each."
                    />
                )}
            </DialogContents>
        </DialogMain>
    );
};

const { remove: removeWorkingAccount, update: updateAccountPartial } = getUpdateFunctions("account");
const createNewAccount = () => ({
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

const EditAccountView: React.FC<{ working: Account }> = ({ working }) => {
    const classes = useEditViewStyles();
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
        </ObjectEditContainer>
    );
};

const updateWorkingIsInactive = updateAccountPartial("isInactive");
const updateWorkingInstitution = updateAccountPartial("institution");
const updateWorkingWebsite = handleTextFieldChange(updateAccountPartial("website"));
const updateWorkingCategory = handleButtonGroupChange(updateAccountPartial("category"));
const updateWorkingOpenDate = (date: MaterialUiPickersDate) =>
    updateAccountPartial("openDate")(formatDate(date as DateTime));
const updateWorkingUpdateDate = (date: MaterialUiPickersDate) =>
    updateAccountPartial("lastUpdate")(formatDate(date as DateTime));
