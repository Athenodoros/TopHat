import { makeStyles, Menu, Typography } from "@material-ui/core";
import { AccountBalanceWallet, Category, Euro } from "@material-ui/icons";
import React from "react";
import { FilterIcon, FilterMenuNestedOption, FilterMenuOption, TableHeaderContainer } from "../../../components/table";
import {
    getAccountCategoryIcon,
    getCurrencyIcon,
    getInstitutionIcon,
    useGetAccountIcon,
} from "../../../components/table/filters/FilterMenuOption";
import { TopHatDispatch } from "../../../state";
import { AppSlice } from "../../../state/app";
import { useAccountsPageState } from "../../../state/app/hooks";
import { useAllAccounts, useAllCurrencies, useAllInstitutions } from "../../../state/data/hooks";
import { AccountTypes } from "../../../state/data/types";
import { ID } from "../../../state/utilities/values";
import { zipObject } from "../../../utilities/data";
import { usePopoverProps } from "../../../utilities/hooks";
import { ACCOUNT_TABLE_LEFT_PADDING, useAccountsTableStyles } from "./styles";

const useStyles = makeStyles((theme) => ({
    institutionInner: {
        display: "flex",
        alignItems: "center",
    },
    accountInner: {
        display: "flex",
        alignItems: "center",
        paddingLeft: ACCOUNT_TABLE_LEFT_PADDING,
    },
}));

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
            <div className={accountsTableClasses.accounts}>
                <div className={classes.accountInner}>
                    <Typography variant="h6">Account</Typography>
                    <FilterIcon
                        badgeContent={filters.account.length || filters.type.length || filters.currency.length}
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
