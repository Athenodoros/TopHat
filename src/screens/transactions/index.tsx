import React from "react";
import { Page } from "../../components/layout";
import { TransactionsTable } from "../../components/table";
import { TopHatDispatch } from "../../state";
import { AppSlice } from "../../state/app";
import { useTransactionsPageFilters, useTransactionsTableEditState } from "../../state/app/hooks";
import { TransactionsTableFilterState } from "../../state/app/pageTypes";
import { TransactionsPageSummary } from "./summary";

export const TransactionsPage: React.FC = () => {
    const filters = useTransactionsPageFilters();
    const tableState = useTransactionsTableEditState();

    return (
        <Page title="Transactions" padding={200}>
            <TransactionsPageSummary />
            <TransactionsTable filters={filters} state={tableState} setFilterPartial={setFilterPartial} />
        </Page>
    );
};

const setFilterPartial = (update: Partial<TransactionsTableFilterState>) =>
    TopHatDispatch(AppSlice.actions.setTransactionsPagePartial(update));
