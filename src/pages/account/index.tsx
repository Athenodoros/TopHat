import makeStyles from "@mui/styles/makeStyles";
import { useMemo } from "react";
import { Page, SECTION_MARGIN } from "../../components/layout";
import { TransactionsTable } from "../../components/table";
import { TransactionsTableFilters, TransactionsTableState } from "../../components/table/table/types";
import { TopHatDispatch } from "../../state";
import { AppSlice } from "../../state/app";
import { useAccountPageAccount, useAccountPageState } from "../../state/app/hooks";
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
    const table = useAccountPageState((state) => state.table);
    const fixed = useMemo(() => ({ type: "account" as const, account: account.id }), [account]);
    const filters = useMemo(() => ({ ...table.filters, account: [account.id] }), [table.filters, account.id]);

    return (
        <Page title="Accounts">
            <AccountPageHeader />
            <div className={classes.middle}>
                <AccountPageBalances />
                <AccountStatementTable />
            </div>
            <TransactionsTable
                filters={filters}
                state={table.state}
                setFilters={setFilters}
                setState={setState}
                fixed={fixed}
            />
        </Page>
    );
};

const setFilters = (filters: TransactionsTableFilters) =>
    TopHatDispatch(AppSlice.actions.setAccountTableStatePartial({ filters }));

const setState = (state: TransactionsTableState) =>
    TopHatDispatch(AppSlice.actions.setAccountTableStatePartial({ state }));
