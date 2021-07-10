import { Avatar, Card, makeStyles, Menu, Typography } from "@material-ui/core";
import { AccountBalance, AccountBalanceWallet, Category, Euro } from "@material-ui/icons";
import { last } from "lodash";
import React from "react";
import { FilterIcon, FilterMenu, NestedMenuSelector } from "../../../components/table";
import { TopHatDispatch } from "../../../state";
import { AppSlice } from "../../../state/app";
import { useAccountsPageState } from "../../../state/app/hooks";
import { useAllAccounts, useAllCurrencies, useAllInstitutions, useInstitutionMap } from "../../../state/data/hooks";
import { AccountTypes } from "../../../state/data/types";
import { ID } from "../../../state/utilities/values";
import { usePopoverProps } from "../../../utilities/hooks";
import { ACCOUNT_TABLE_LEFT_PADDING } from "./account";
import { ICON_MARGIN_LEFT, ICON_MARGIN_RIGHT, ICON_WIDTH, INSTITUTION_WIDTH } from "./institution";

const useStyles = makeStyles((theme) => ({
    container: {
        height: 60,
        top: 0,
        position: "sticky",
        backgroundColor: theme.palette.background.default,
        zIndex: 1,
        margin: "-20px -10px 10px -10px",
        padding: "20px 10px 0 10px",
    },
    card: {
        height: 50,
        display: "flex",
        alignItems: "center",
    },
    institution: {
        display: "flex",
        alignItems: "center",
        paddingLeft: ICON_MARGIN_LEFT + ICON_WIDTH + ICON_MARGIN_RIGHT,
        width: INSTITUTION_WIDTH,

        "& > h6": {
            marginLeft: 10,
        },
    },
    account: {
        display: "flex",
        alignItems: "center",
        paddingLeft: ACCOUNT_TABLE_LEFT_PADDING,

        "& > h6": {
            marginLeft: 10,
        },
    },
    filters: {
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
    },
    filter: {
        display: "flex",
        justifyContent: "space-between",
    },
}));

export const AccountsTableHeader: React.FC = () => {
    const classes = useStyles();
    const popover1 = usePopoverProps();
    const popover2 = usePopoverProps();

    const filters = useAccountsPageState();
    const institutionMap = useInstitutionMap();
    const institutions = useAllInstitutions();
    const accounts = useAllAccounts();
    const currencies = useAllCurrencies();

    return (
        <div className={classes.container}>
            <Card elevation={2} className={classes.card}>
                <div className={classes.institution}>
                    <FilterIcon badgeContent={filters.institution.length} ButtonProps={popover1.buttonProps} />
                    <Typography variant="h6">Institution</Typography>
                    <FilterMenu
                        options={institutions}
                        MenuProps={{
                            ...popover1.popoverProps,
                            PaperProps: { style: { maxHeight: 300, width: 300 } },
                        }}
                        select={onSelectIDs("institution")}
                        selected={filters.institution}
                        getOptionIcon={(institution, className) => (
                            <Avatar src={institution.icon} className={className}>
                                <AccountBalance style={{ height: "60%" }} />
                            </Avatar>
                        )}
                    />
                </div>
                <div className={classes.account}>
                    <FilterIcon
                        badgeContent={filters.account.length || filters.type.length || filters.currency.length}
                        ButtonProps={popover2.buttonProps}
                    />
                    <Typography variant="h6">Account</Typography>
                    <Menu
                        {...popover2.popoverProps}
                        PaperProps={{
                            style: {
                                width: 300,
                            },
                        }}
                    >
                        <NestedMenuSelector
                            icon={Category}
                            name="Types"
                            select={onSelectIDs("type")}
                            selected={filters.type}
                            options={AccountTypes}
                            getOptionIcon={(type, className) => (
                                <Avatar className={className} style={{ backgroundColor: type.colour }}>
                                    <type.icon style={{ height: "60%" }} />
                                </Avatar>
                            )}
                        />
                        <NestedMenuSelector
                            icon={Euro}
                            name="Currencies"
                            select={onSelectIDs("currency")}
                            selected={filters.currency}
                            options={currencies}
                            getOptionIcon={(currency, className) => (
                                <Avatar className={className} style={{ backgroundColor: currency.colour }}>
                                    <Typography variant="button">{last(currency.symbol)}</Typography>
                                </Avatar>
                            )}
                        />
                        <NestedMenuSelector
                            icon={AccountBalanceWallet}
                            name="Accounts"
                            select={onSelectIDs("account")}
                            selected={filters.account}
                            options={accounts}
                            getOptionIcon={(account, className) => (
                                <Avatar src={institutionMap[account.institution!]?.icon} className={className}>
                                    <AccountBalance style={{ height: "60%" }} />
                                </Avatar>
                            )}
                        />
                    </Menu>
                </div>
            </Card>
        </div>
    );
};

const onSelectIDs = (type: "account" | "institution" | "currency" | "type") => (ids: ID[]) =>
    TopHatDispatch(AppSlice.actions.setAccountsPagePartial({ [type]: ids }));
