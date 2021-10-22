import { CheckBox, CheckBoxOutlineBlank } from "@mui/icons-material";
import { Autocomplete, Checkbox, Collapse, ListItemText, Switch, TextField, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { Box } from "@mui/system";
import React, { useCallback } from "react";
import { useGetAccountIcon } from "../../components/display/ObjectDisplay";
import { useNumericInputHandler } from "../../shared/hooks";
import { TopHatDispatch } from "../../state";
import { DataSlice } from "../../state/data";
import { useAllAccounts } from "../../state/data/hooks";
import { StubUserID } from "../../state/data/types";
import { ACCOUNTS_NOTIFICATION_ID } from "../../state/logic/notifications/variants/accounts";
import { DEBT_NOTIFICATION_ID } from "../../state/logic/notifications/variants/debt";
import { MILESTONE_NOTIFICATION_ID } from "../../state/logic/notifications/variants/milestone";
import { UNCATEGORISED_NOTIFICATION_ID } from "../../state/logic/notifications/variants/uncategorised";
import { useSelector } from "../../state/shared/hooks";
import { EditValueContainer } from "../shared";
import { SettingsDialogDivider, SettingsDialogPage } from "./shared";

export const DialogNotificationsContents: React.FC = () => {
    return (
        <SettingsDialogPage title="Notification Settings">
            <Typography variant="body2">
                Notifications can be enabled and disabled, and will be checked continuously when TopHat is running in
                your browser.
            </Typography>
            <SettingsDialogDivider />
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "stretch" }}>
                <NotificationToggle id={UNCATEGORISED_NOTIFICATION_ID} title="Uncategorised Transactions" />
                <NotificationToggle
                    id={ACCOUNTS_NOTIFICATION_ID}
                    title="Out-of-Date Accounts"
                    control={useAccountsAutocomplete()}
                />
                <NotificationToggle
                    id={MILESTONE_NOTIFICATION_ID}
                    title="Net Worth Milestones"
                    control={useNetWorthInput()}
                />
                <NotificationToggle id={DEBT_NOTIFICATION_ID} title="Debt Milestones" control={useDebtInput()} />
            </Box>
        </SettingsDialogPage>
    );
};

const NotificationToggle: React.FC<{ id: string; title: string; control?: React.ReactNode }> = ({
    id,
    title,
    control,
}) => {
    const disabled = useSelector((state) => state.data.user.entities[StubUserID]!.disabled.includes(id));
    const toggle = useCallback(() => TopHatDispatch(DataSlice.actions.toggleNotification(id)), [id]);

    return (
        <Box sx={{ marginBottom: 20 / 8 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="button">{title}</Typography>
                <Switch checked={!disabled} onChange={toggle} sx={{ margin: -5 / 8 }} />
            </Box>
            {control && (
                <Collapse in={!disabled} sx={{ "& .MuiCollapse-wrapperInner > div": { margin: 0 } }}>
                    {control}
                </Collapse>
            )}
        </Box>
    );
};

const useAutocompleteStyles = makeStyles({
    icon: {
        height: 20,
        width: 20,
        borderRadius: 4,
        marginRight: 10,
    },
    text: {
        padding: "4px 0",

        "& span": {
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            overflow: "hidden",
        },
    },
});
const useAccountsAutocomplete = () => {
    const classes = useAutocompleteStyles();
    const accounts = useAllAccounts();
    const selected = useSelector((state) => state.data.user.entities[StubUserID]!.accountOutOfDate);
    const getAccountIcon = useGetAccountIcon();

    return (
        <EditValueContainer label="Ignored Accounts">
            <Autocomplete
                multiple={true}
                disableCloseOnSelect={true}
                sx={{ flexGrow: 1 }}
                options={accounts}
                getOptionLabel={(account) => account.name}
                defaultValue={accounts.filter(({ id }) => selected.includes(id))}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        placeholder="(none)"
                        size="small"
                        sx={{
                            "& .MuiInputBase-input::placeholder": {
                                fontStyle: "italic",
                            },
                        }}
                    />
                )}
                renderOption={(props, account, { selected }) => (
                    <li {...props}>
                        {getAccountIcon(account, classes.icon)}
                        <ListItemText className={classes.text} primary={account.name} />
                        <Checkbox
                            icon={<CheckBoxOutlineBlank fontSize="small" />}
                            checkedIcon={<CheckBox fontSize="small" />}
                            style={{ marginRight: 8 }}
                            checked={selected}
                            color="primary"
                        />
                    </li>
                )}
            />
        </EditValueContainer>
    );
};

const setNetWorthMilestone = (value: number | null) =>
    TopHatDispatch(DataSlice.actions.updateUserPartial({ milestone: value ?? 10000 }));
const useNetWorthInput = () => {
    const milestone = useSelector((state) => state.data.user.entities[StubUserID]!.milestone);
    const input = useNumericInputHandler(milestone, setNetWorthMilestone);

    return (
        <EditValueContainer label="Previous Notification">
            <TextField
                value={input.text}
                onChange={input.onTextChange}
                size="small"
                placeholder="10000"
                sx={{ flexGrow: 1 }}
            />
        </EditValueContainer>
    );
};

const setDebtMilestone = (value: number | null) =>
    TopHatDispatch(DataSlice.actions.updateUserPartial({ debt: value ?? 10000 }));
const useDebtInput = () => {
    const debt = useSelector((state) => state.data.user.entities[StubUserID]!.debt);
    const input = useNumericInputHandler(debt, setDebtMilestone);

    return (
        <EditValueContainer label="Previous Notification">
            <TextField
                value={input.text}
                onChange={input.onTextChange}
                size="small"
                placeholder="10000"
                sx={{ flexGrow: 1 }}
            />
        </EditValueContainer>
    );
};
