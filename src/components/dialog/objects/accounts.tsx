import { alpha, Button, List, ListItemText, makeStyles, MenuItem, TextField, Typography } from "@material-ui/core";
import {
    AccountBalanceWallet,
    AddCircleOutline,
    DeleteForeverTwoTone,
    DeleteTwoTone,
    Event,
    KeyboardArrowDown,
    SaveTwoTone,
} from "@material-ui/icons";
import { ToggleButton, ToggleButtonGroup } from "@material-ui/lab";
import { KeyboardDatePicker } from "@material-ui/pickers";
import { MaterialUiPickersDate } from "@material-ui/pickers/typings/date";
import clsx from "clsx";
import { isEqual } from "lodash";
import { DateTime } from "luxon";
import React from "react";
import { TopHatDispatch, TopHatStore } from "../../../state";
import { AppSlice } from "../../../state/app";
import { useDialogState } from "../../../state/app/hooks";
import { Account } from "../../../state/data";
import { useAccountByID, useAllAccounts, useAllInstitutions, useInstitutionByID } from "../../../state/data/hooks";
import { AccountTypes } from "../../../state/data/types";
import { getNextID, PLACEHOLDER_INSTITUTION_ID } from "../../../state/data/utilities";
import { BaseTransactionHistory, formatDate, getTodayString } from "../../../state/utilities/values";
import { Greys, Intents } from "../../../styles/colours";
import { handleButtonGroupChange, handleTextFieldChange, withSuppressEvent } from "../../../utilities/events";
import { getInstitutionIcon, useGetAccountIcon } from "../../display/ObjectDisplay";
import { ObjectSelector, SubItemCheckbox } from "../../inputs";
import { DialogContents, DialogMain, DialogOptions, DialogPlaceholderDisplay, EditValueContainer } from "../utilities";

const useStyles = makeStyles((theme) => ({
    options: {
        overflow: "scroll",
        flexGrow: 1,
        marginTop: 5,
    },
    disabled: {
        opacity: 0.5,
        fontStyle: "italic",
        transition: theme.transitions.create("opacity"),
        "&:hover": { opacity: 1 },
    },
    institution: {
        textTransform: "inherit",
        height: 40,

        "& .MuiButton-label > svg:last-child": {
            marginLeft: 15,
        },
    },
    smallIcon: {
        height: 16,
        width: 16,
        marginRight: 10,
        borderRadius: 3,
    },
    icon: {
        height: 24,
        width: 24,
        marginRight: 15,
        borderRadius: 5,
    },
    button: {
        margin: 20,
    },
    edit: {
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        minHeight: 0,
        padding: "20px 20px 8px 20px",
        flexGrow: 1,
    },
    editContainer: {
        flexGrow: 1,
        flexShrink: 1,
        overflowY: "scroll",
    },
    divider: {
        height: 1,
        width: "80%",
        background: Greys[400],
        alignSelf: "left",
        margin: "10px 25px",
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
    dates: {
        display: "flex",
        flexGrow: 1,
        justifyContent: "space-between",
        marginTop: 5,

        "& > :first-child": {
            marginRight: 30,
        },
    },
    inactive: {
        alignSelf: "flex-end",
    },
    actions: {
        display: "flex",
        alignSelf: "flex-end",
        "& > *": {
            marginLeft: 10,
        },
    },
    warningButton: {
        color: Intents.warning.main,
        "&:hover": {
            backgroundColor: alpha(Intents.warning.main, theme.palette.action.hoverOpacity),
        },
    },
    dangerButton: {
        color: Intents.danger.main,
        "&:hover": {
            backgroundColor: alpha(Intents.danger.main, theme.palette.action.hoverOpacity),
        },
    },
    primaryButtonOutlined: {
        color: Intents.primary.main,
        border: `1px solid ${alpha(Intents.primary.main, 0.5)}`,
        "&:hover": {
            border: `1px solid ${Intents.primary.main}`,
            backgroundColor: alpha(Intents.primary.main, theme.palette.action.hoverOpacity),
        },
    },
}));

export const DialogAccountsView: React.FC = () => {
    const classes = useStyles();

    const working = useDialogState("account");

    const getAccountIcon = useGetAccountIcon();
    const institution = useInstitutionByID(working?.institution);

    const account = useAccountByID(working?.id);
    const accounts = useAllAccounts();
    const institutions = useAllInstitutions();

    return (
        <DialogMain onClick={removeWorkingAccount}>
            <DialogOptions>
                <div className={classes.options}>
                    <List>
                        {accounts.map((account) => (
                            <MenuItem
                                key={account.id}
                                selected={account.id === working?.id}
                                onClick={selectWorkingAccount(account)}
                                className={clsx(account.isInactive && classes.disabled)}
                            >
                                {getAccountIcon(account, classes.icon)}
                                <ListItemText>{account.name}</ListItemText>
                            </MenuItem>
                        ))}
                    </List>
                </div>
                <Button
                    className={classes.button}
                    variant="outlined"
                    color="primary"
                    startIcon={<AddCircleOutline />}
                    onClick={createNewAccount}
                >
                    New Account
                </Button>
            </DialogOptions>
            <DialogContents>
                {working ? (
                    <div className={classes.edit}>
                        <TextField
                            variant="outlined"
                            label="Account Name"
                            value={working.name}
                            onChange={updateWorkingName}
                        />
                        <SubItemCheckbox
                            label="Inactive Account"
                            checked={working.isInactive}
                            setChecked={updateWorkingIsInactive}
                            className={classes.inactive}
                        />
                        <div className={classes.divider} />
                        <div className={classes.editContainer}>
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
                                            {institution!.name}
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
                                    value={working.website}
                                    onChange={updateWorkingWebsite}
                                    size="small"
                                    style={{ width: "100%" }}
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
                        </div>
                        <div className={classes.actions}>
                            <Button
                                className={classes.warningButton}
                                disabled={isEqual(working, account)}
                                startIcon={<DeleteTwoTone fontSize="small" />}
                            >
                                Reset
                            </Button>
                            <Button
                                className={classes.dangerButton}
                                startIcon={<DeleteForeverTwoTone fontSize="small" />}
                            >
                                Delete
                            </Button>
                            <Button
                                className={classes.primaryButtonOutlined}
                                disabled={isEqual(working, account)}
                                variant="outlined"
                                startIcon={<SaveTwoTone fontSize="small" />}
                            >
                                Save
                            </Button>
                        </div>
                    </div>
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

const getWorkingAccount = () => TopHatStore.getState().app.dialog.account;
const setWorkingAccount = (account?: Account) => TopHatDispatch(AppSlice.actions.setDialogPartial({ account }));
const setWorkingAccountPartial = (partial?: Partial<Account>) =>
    setWorkingAccount({
        ...getWorkingAccount()!,
        ...partial,
    });

const selectWorkingAccount = (account: Account) =>
    withSuppressEvent(() => setWorkingAccount(getWorkingAccount()?.id === account.id ? undefined : account));
const removeWorkingAccount = () => setWorkingAccount();
const createNewAccount = withSuppressEvent(() =>
    setWorkingAccount({
        id: getNextID(TopHatStore.getState().data.account.ids),
        name: "New Account",
        isInactive: false,
        category: 1,
        institution: PLACEHOLDER_INSTITUTION_ID,
        openDate: getTodayString(),
        lastUpdate: getTodayString(),
        balances: {},
        transactions: BaseTransactionHistory(),
    })
);

const updateAccountPartial =
    <K extends keyof Account>(key: K) =>
    (value: Account[K]) =>
        setWorkingAccountPartial({ [key]: value });
const updateWorkingName = handleTextFieldChange(updateAccountPartial("name"));
const updateWorkingIsInactive = updateAccountPartial("isInactive");
const updateWorkingInstitution = updateAccountPartial("institution");
const updateWorkingWebsite = handleTextFieldChange(updateAccountPartial("website"));
const updateWorkingCategory = handleButtonGroupChange(updateAccountPartial("category"));
const updateWorkingOpenDate = (date: MaterialUiPickersDate) =>
    updateAccountPartial("openDate")(formatDate(date as DateTime));
const updateWorkingUpdateDate = (date: MaterialUiPickersDate) =>
    updateAccountPartial("lastUpdate")(formatDate(date as DateTime));
