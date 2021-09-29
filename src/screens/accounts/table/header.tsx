import {
    AccountBalance,
    AccountBalanceWallet,
    AddCircleOutline,
    Category,
    Euro,
    Exposure,
    IndeterminateCheckBox,
} from "@mui/icons-material";
import {
    IconButton,
    ListItem,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import clsx from "clsx";
import React, { useCallback } from "react";
import { createNewAccount } from "../../../components/dialog/pages/accounts";
import { createNewInstitution } from "../../../components/dialog/pages/institutions";
import {
    getAccountCategoryIcon,
    getCurrencyIcon,
    getInstitutionIcon,
    useGetAccountIcon,
} from "../../../components/display/ObjectDisplay";
import { FilterIcon, FilterMenuNestedOption, FilterMenuOption, TableHeaderContainer } from "../../../components/table";
import { TopHatDispatch } from "../../../state";
import { AppSlice } from "../../../state/app";
import { useAccountsPageState } from "../../../state/app/hooks";
import { ChartSign } from "../../../state/app/pageTypes";
import { useAllAccounts, useAllCurrencies, useAllInstitutions } from "../../../state/data/hooks";
import { AccountTypes } from "../../../state/data/types";
import { ID } from "../../../state/utilities/values";
import { zipObject } from "../../../utilities/data";
import { usePopoverProps } from "../../../utilities/hooks";
import { ACCOUNT_TABLE_LEFT_PADDING, useAccountsTableStyles } from "./styles";

const useStyles = makeStyles({
    institutionInner: {
        display: "flex",
        alignItems: "center",
    },
    accounts: {
        flexDirection: "row",
    },
    accountInner: {
        display: "flex",
        alignItems: "center",
        paddingLeft: ACCOUNT_TABLE_LEFT_PADDING,
        flexGrow: 1,
    },
    actions: {
        paddingLeft: 10,
    },
    actionsItem: {
        width: 250,
        height: 48,
    },
});

export const AccountsTableHeader: React.FC = () => {
    const accountsTableClasses = useAccountsTableStyles();
    const classes = useStyles();
    const popover1 = usePopoverProps();
    const popover2 = usePopoverProps();

    const filters = useAccountsPageState();
    const institutions = useAllInstitutions();
    const accounts = useAllAccounts();
    const currencies = useAllCurrencies();

    const getAccountIcon = useGetAccountIcon();

    const AddNewPopover = usePopoverProps();

    const startAccountCreationCallback = useCallback(() => {
        AddNewPopover.setIsOpen(false);
        startAccountCreation();
    }, [AddNewPopover]);
    const startInstitutionCreationCallback = useCallback(() => {
        AddNewPopover.setIsOpen(false);
        startInstitutionCreation();
    }, [AddNewPopover]);

    return (
        <TableHeaderContainer>
            <div className={accountsTableClasses.icon} />
            <div className={accountsTableClasses.institution}>
                <div className={classes.institutionInner}>
                    <Typography variant="h6">Institution</Typography>
                    <FilterIcon badgeContent={filters.institution.length} ButtonProps={popover1.buttonProps} />
                    <Menu {...popover1.popoverProps} PaperProps={{ style: { maxHeight: 300, width: 300 } }}>
                        {institutions.map((institution) => (
                            <FilterMenuOption
                                key={institution.id}
                                option={institution}
                                select={onSelectIDs["institution"]}
                                selected={filters.institution}
                                getOptionIcon={getInstitutionIcon}
                            />
                        ))}
                    </Menu>
                </div>
            </div>
            <div className={clsx(accountsTableClasses.accounts, classes.accounts)}>
                <div className={classes.accountInner}>
                    <Typography variant="h6">Account</Typography>
                    <FilterIcon
                        badgeContent={
                            filters.account.length ||
                            filters.type.length ||
                            filters.currency.length ||
                            filters.balances !== "all"
                        }
                        ButtonProps={popover2.buttonProps}
                    />
                    <Menu
                        {...popover2.popoverProps}
                        PaperProps={{
                            style: {
                                width: 300,
                            },
                        }}
                    >
                        <FilterMenuNestedOption
                            icon={Category}
                            name="Types"
                            count={filters.type.length}
                            maxHeight={250}
                        >
                            {AccountTypes.map((option) => (
                                <FilterMenuOption
                                    key={option.id}
                                    option={option}
                                    select={onSelectIDs["type"]}
                                    selected={filters.type}
                                    getOptionIcon={getAccountCategoryIcon}
                                />
                            ))}
                        </FilterMenuNestedOption>
                        <FilterMenuNestedOption
                            icon={Euro}
                            name="Currencies"
                            count={filters.currency.length}
                            maxHeight={250}
                        >
                            {currencies.map((option) => (
                                <FilterMenuOption
                                    key={option.id}
                                    option={option}
                                    select={onSelectIDs["currency"]}
                                    selected={filters.currency}
                                    getOptionIcon={getCurrencyIcon}
                                />
                            ))}
                        </FilterMenuNestedOption>
                        <FilterMenuNestedOption
                            icon={AccountBalanceWallet}
                            name="Accounts"
                            count={filters.account.length}
                            maxHeight={250}
                        >
                            {accounts.map((option) => (
                                <FilterMenuOption
                                    key={option.id}
                                    option={option}
                                    select={onSelectIDs["account"]}
                                    selected={filters.account}
                                    getOptionIcon={getAccountIcon}
                                />
                            ))}
                        </FilterMenuNestedOption>
                        <ListItem>
                            <ListItemText>Balances</ListItemText>
                            <ToggleButtonGroup
                                size="small"
                                value={filters.balances}
                                exclusive={true}
                                onChange={onSetBalances}
                            >
                                <ToggleButton value="all">
                                    <Exposure fontSize="small" />
                                </ToggleButton>
                                <ToggleButton value="credits">
                                    <AddCircleOutline fontSize="small" />
                                </ToggleButton>
                                <ToggleButton value="debits">
                                    <IndeterminateCheckBox fontSize="small" />
                                </ToggleButton>
                            </ToggleButtonGroup>
                        </ListItem>
                    </Menu>
                </div>
                <div className={classes.actions}>
                    <IconButton size="small" {...AddNewPopover.buttonProps}>
                        <AddCircleOutline />
                    </IconButton>
                    <Menu
                        {...AddNewPopover.popoverProps}
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                        transformOrigin={{ vertical: "top", horizontal: "right" }}
                    >
                        <MenuItem onClick={startAccountCreationCallback} className={classes.actionsItem}>
                            <ListItemIcon>
                                <AccountBalanceWallet />
                            </ListItemIcon>
                            <ListItemText>New Account</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={startInstitutionCreationCallback} className={classes.actionsItem}>
                            <ListItemIcon>
                                <AccountBalance />
                            </ListItemIcon>
                            <ListItemText>New Institution</ListItemText>
                        </MenuItem>
                    </Menu>
                </div>
            </div>
        </TableHeaderContainer>
    );
};

const filters = ["account", "institution", "currency", "type"] as const;
const onSelectIDs = zipObject(
    filters,
    filters.map((f) => (ids: ID[]) => TopHatDispatch(AppSlice.actions.setAccountsPagePartial({ [f]: ids })))
);

const onSetBalances = (_: any, balances: ChartSign) =>
    TopHatDispatch(AppSlice.actions.setAccountsPagePartial({ balances }));

const startAccountCreation = () =>
    TopHatDispatch(AppSlice.actions.setDialogPartial({ id: "account", account: createNewAccount() }));
const startInstitutionCreation = () =>
    TopHatDispatch(AppSlice.actions.setDialogPartial({ id: "institution", institution: createNewInstitution() }));
