import styled from "@emotion/styled";
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

const MiddleBox = styled("div")({
    display: "flex",
    "& > div:first-of-type": {
        flex: "2 0 700px",
        marginRight: SECTION_MARGIN,
    },
    "& > div:last-child": {
        flex: "1 1 300px",
    },
});

export const AccountPage: React.FC = () => {
    const account = useAccountPageAccount();
    const table = useAccountPageState((state) => state.table);
    const id = account?.id ?? -1; // Continue hooks in case Account is deleted while on page
    const fixed = useMemo(() => ({ type: "account" as const, account: id }), [id]);

    // "table" is only undefined when redirecting to AccountsPage after deletion
    const filters = useMemo(() => ({ ...table?.filters, account: [id] }), [table?.filters, id]);

    if (!account) {
        TopHatDispatch(AppSlice.actions.setPage("accounts"));
        return <Page title="Accounts" />;
    }

    return (
        <Page title="Accounts">
            <AccountPageHeader />
            <MiddleBox>
                <AccountPageBalances />
                <AccountStatementTable />
            </MiddleBox>
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
