import React from "react";
import { Page } from "../../components/layout";
import { TransactionsTable } from "../../components/table";
import { TransactionsTableFilters, TransactionsTableState } from "../../components/table/table/types";
import { TopHatDispatch } from "../../state";
import { AppSlice } from "../../state/app";
import { useTransactionsPageState } from "../../state/app/hooks";
import { TransactionsPageSummary } from "./summary";

export const TransactionsPage: React.FC = () => {
    const { filters, state } = useTransactionsPageState((state) => state.table);

    return (
        <Page title="Transactions">
            <TransactionsPageSummary />
            <TransactionsTable filters={filters} state={state} setFilters={setFilters} setState={setState} />
        </Page>
    );
};

const setFilters = (filters: TransactionsTableFilters) =>
    TopHatDispatch(AppSlice.actions.setTransactionsTablePartial({ filters }));

const setState = (state: TransactionsTableState) =>
    TopHatDispatch(AppSlice.actions.setTransactionsTablePartial({ state }));
