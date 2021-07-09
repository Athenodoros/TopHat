import {
    Badge,
    Card,
    Checkbox,
    IconButton,
    ListItemText,
    makeStyles,
    Menu,
    MenuItem,
    Typography,
} from "@material-ui/core";
import { CheckBox, CheckBoxOutlineBlank, FilterList } from "@material-ui/icons";
import React from "react";
import { TopHatDispatch, TopHatStore } from "../../../state";
import { AppSlice } from "../../../state/app";
import { useAccountsPageState } from "../../../state/app/hooks";
import { AccountsPageState } from "../../../state/app/types";
import { useAllAccounts, useAllInstitutions } from "../../../state/data/hooks";
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
            marginRight: 20,
        },
    },
    account: {
        display: "flex",
        alignItems: "center",
        paddingLeft: ACCOUNT_TABLE_LEFT_PADDING,

        "& > h6": {
            marginRight: 20,
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
    const institutions = useAllInstitutions();
    const accounts = useAllAccounts();

    return (
        <div className={classes.container}>
            <Card elevation={2} className={classes.card}>
                <div className={classes.institution}>
                    <Typography variant="h6">Institution</Typography>
                    <Badge badgeContent={filters.institution.length} color="primary">
                        <IconButton size="small" {...popover1.buttonProps}>
                            <FilterList fontSize="small" />
                        </IconButton>
                    </Badge>
                    <Menu
                        {...popover1.popoverProps}
                        PaperProps={{
                            style: {
                                maxHeight: 300,
                                width: 300,
                            },
                        }}
                    >
                        {institutions.map((institution) => (
                            <MenuItem
                                key={institution.id}
                                selected={filters.institution.includes(institution.id)}
                                onClick={onSelectID(institution.id, "institution")}
                            >
                                <Checkbox
                                    icon={<CheckBoxOutlineBlank fontSize="small" />}
                                    checkedIcon={<CheckBox fontSize="small" />}
                                    style={{ marginRight: 8 }}
                                    checked={filters.institution.includes(institution.id)}
                                />
                                <ListItemText>{institution.name}</ListItemText>
                            </MenuItem>
                        ))}
                    </Menu>
                </div>
                <div className={classes.account}>
                    <Typography variant="h6">Account</Typography>
                    <Badge badgeContent={filters.account.length} color="primary">
                        <IconButton size="small" {...popover2.buttonProps}>
                            <FilterList fontSize="small" />
                        </IconButton>
                    </Badge>
                    <Menu
                        {...popover2.popoverProps}
                        PaperProps={{
                            style: {
                                maxHeight: 300,
                                width: 300,
                            },
                        }}
                    >
                        {accounts.map((account) => (
                            <MenuItem
                                key={account.id}
                                selected={filters.account.includes(account.id)}
                                onClick={onSelectID(account.id, "account")}
                            >
                                <Checkbox
                                    icon={<CheckBoxOutlineBlank fontSize="small" />}
                                    checkedIcon={<CheckBox fontSize="small" />}
                                    style={{ marginRight: 8 }}
                                    checked={filters.account.includes(account.id)}
                                />
                                <ListItemText>{account.name}</ListItemText>
                            </MenuItem>
                        ))}
                    </Menu>
                </div>
            </Card>
        </div>
    );
};

const onSelectID = (id: number, type: "account" | "institution") => () => {
    const current = (TopHatStore.getState().app.page as AccountsPageState)[type];

    TopHatDispatch(
        AppSlice.actions.setAccountsPagePartial({
            [type]: current.includes(id) ? current.filter((c) => c !== id) : current.concat([id]),
        })
    );
};
