import {
    Button,
    Checkbox,
    FormControl,
    FormControlLabel,
    List,
    ListItemText,
    makeStyles,
    Menu,
    MenuItem,
    Select,
    TextField,
    Typography,
} from "@material-ui/core";
import { AccountBalanceWallet, AddCircleOutline } from "@material-ui/icons";
import { KeyboardDatePicker } from "@material-ui/pickers";
import { MaterialUiPickersDate } from "@material-ui/pickers/typings/date";
import clsx from "clsx";
import { DateTime } from "luxon";
import React from "react";
import { TopHatDispatch, TopHatStore } from "../../../state";
import { AppSlice } from "../../../state/app";
import { useDialogState } from "../../../state/app/hooks";
import { Account } from "../../../state/data";
import { useAllAccounts, useAllInstitutions, useInstitutionByID } from "../../../state/data/hooks";
import { AccountTypes } from "../../../state/data/types";
import { getNextID, PLACEHOLDER_INSTITUTION_ID } from "../../../state/data/utilities";
import { BaseTransactionHistory, formatDate, getTodayString } from "../../../state/utilities/values";
import { Greys } from "../../../styles/colours";
import {
    handleCheckboxChange,
    handleSelectChange,
    handleTextFieldChange,
    withSuppressEvent,
} from "../../../utilities/events";
import { useDivBoundingRect, usePopoverProps } from "../../../utilities/hooks";
import { getInstitutionIcon, useGetAccountIcon } from "../../display/ObjectDisplay";
import { DialogContents, DialogMain, DialogOptions, DialogPlaceholderDisplay } from "../utilities";

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
    icon: {
        height: 24,
        width: 24,
        marginLeft: 5,
        marginRight: 16,
        borderRadius: 5,
    },
    button: {
        margin: 20,
    },
    edit: {
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
    },
    editRight: {
        alignSelf: "flex-end",
    },
    divider: {
        height: 1,
        width: "50%",
        background: Greys[500],
        alignSelf: "center",
        margin: "20px 0",
    },
    editContainer: {
        marginTop: 20,
        display: "flex",
        alignItems: "stretch",
        justifyContent: "space-between",

        "& > div": {
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
        },

        "& > div:nth-child(2)": {
            alignItems: "flex-end",
        },
    },
}));

export const DialogAccountsView: React.FC = () => {
    const classes = useStyles();
    const popover = usePopoverProps<HTMLDivElement>();
    const [{ width }, dropdown] = useDivBoundingRect();

    const working = useDialogState("account");

    const getAccountIcon = useGetAccountIcon();
    const institution = useInstitutionByID(working?.institution);

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
                                className={clsx(account.isActive || classes.disabled)}
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
                        <FormControlLabel
                            control={
                                <Checkbox
                                    color="primary"
                                    size="small"
                                    value={working.isActive}
                                    onChange={updateWorkingIsActive}
                                />
                            }
                            label="Is Active"
                            labelPlacement="start"
                            className={classes.editRight}
                        />
                        <div className={classes.divider} />
                        <div className={classes.editContainer}>
                            <div ref={dropdown}>
                                <Typography variant="subtitle2">Institution</Typography>
                                <Button
                                    variant="outlined"
                                    component="div"
                                    {...popover.buttonProps}
                                    style={{ flexGrow: 1 }}
                                >
                                    {getInstitutionIcon(institution!, classes.icon)}
                                    <ListItemText>{institution!.name}</ListItemText>
                                </Button>
                                <Menu
                                    {...popover.popoverProps}
                                    anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                                    transformOrigin={{ vertical: "top", horizontal: "left" }}
                                    PaperProps={{ style: { maxHeight: 300, width: Math.max(width, 200) } }}
                                >
                                    {institutions.map((option) => (
                                        <MenuItem
                                            key={option.id}
                                            selected={option.id === institution!.id}
                                            onClick={() => updateWorkingInstitution(option.id)}
                                        >
                                            {getInstitutionIcon(option, classes.icon)}
                                            <ListItemText>{option.name}</ListItemText>
                                        </MenuItem>
                                    ))}
                                </Menu>
                            </div>
                            <div>
                                <Typography variant="subtitle2">Account Type</Typography>
                                <FormControl variant="outlined" size="small">
                                    <Select
                                        value={working.category}
                                        onChange={updateWorkingCategory}
                                        style={{ width: 220 }}
                                    >
                                        {AccountTypes.map((type) => (
                                            <MenuItem value={type.id} key={type.id}>
                                                <ListItemText>{type.name}</ListItemText>
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </div>
                        </div>
                        <div className={classes.editContainer}>
                            <div>
                                <Typography variant="subtitle2">Open Date</Typography>
                                <KeyboardDatePicker
                                    value={working.openDate}
                                    onChange={updateWorkingOpenDate}
                                    disableFuture={true}
                                    format="yyyy-MM-dd"
                                    inputVariant="outlined"
                                    size="small"
                                    style={{ width: 200 }}
                                />
                            </div>
                            <div>
                                <Typography variant="subtitle2">Last Update Date</Typography>
                                <KeyboardDatePicker
                                    value={working.lastUpdate}
                                    onChange={updateWorkingUpdateDate}
                                    disableFuture={true}
                                    format="yyyy-MM-dd"
                                    inputVariant="outlined"
                                    size="small"
                                    style={{ width: 200 }}
                                />
                            </div>
                        </div>
                        <div className={classes.editContainer}>
                            <div>
                                <Typography variant="subtitle2">Website?</Typography>
                                <TextField
                                    variant="outlined"
                                    value={working.website}
                                    onChange={updateWorkingWebsite}
                                    size="small"
                                    style={{ width: "100%" }}
                                />
                            </div>
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
        isActive: true,
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
const updateWorkingIsActive = handleCheckboxChange(updateAccountPartial("isActive"));
const updateWorkingInstitution = updateAccountPartial("institution");
const updateWorkingWebsite = handleTextFieldChange(updateAccountPartial("website"));
const updateWorkingCategory = handleSelectChange(updateAccountPartial("category"));
const updateWorkingOpenDate = (date: MaterialUiPickersDate) =>
    updateAccountPartial("openDate")(formatDate(date as DateTime));
const updateWorkingUpdateDate = (date: MaterialUiPickersDate) =>
    updateAccountPartial("lastUpdate")(formatDate(date as DateTime));
