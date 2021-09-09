import { makeStyles } from "@material-ui/core";
import { omit } from "lodash";
import { useMemo } from "react";
import { Page, SECTION_MARGIN } from "../../components/layout";
import { TransactionsTable } from "../../components/table";
import { TopHatDispatch } from "../../state";
import { AppSlice } from "../../state/app";
import { useAccountPageAccount, useAccountPageFilters, useTransactionsTableEditState } from "../../state/app/hooks";
import { TransactionsTableFilterState } from "../../state/app/pageTypes";
import { AccountPageBalances } from "./balances";
import { AccountPageHeader } from "./header";
import { AccountStatementTable } from "./statements";

const useStyles = makeStyles({
    middle: {
        display: "flex",
        "& > div:first-child": {
            flex: "2 0 700px",
            marginRight: SECTION_MARGIN,
        },
        "& > div:last-child": {
            flex: "1 1 300px",
        },
    },
});

export const AccountPage: React.FC = () => {
    const classes = useStyles();

    const account = useAccountPageAccount();
    const pageFilters = useAccountPageFilters();
    const tableState = useTransactionsTableEditState();
    const fixed = useMemo(() => ({ type: "account" as const, account: account.id }), [account]);
    const filters = useMemo(() => ({ ...pageFilters, account: [account.id] }), [pageFilters, account.id]);

    return (
        <Page title="Accounts" padding={200}>
            <AccountPageHeader />
            <div className={classes.middle}>
                <AccountPageBalances />
                <AccountStatementTable />
            </div>
            <TransactionsTable filters={filters} state={tableState} setFilterPartial={setFilterPartial} fixed={fixed} />
        </Page>
    );
};

const setFilterPartial = (update: Partial<TransactionsTableFilterState>) =>
    TopHatDispatch(AppSlice.actions.setAccountPagePartial(omit(update, "account")));
