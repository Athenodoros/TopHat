import React from "react";
import { Page } from "../../components/layout";
import { TransactionsPageSummary } from "./summary";
import { TransactionsTable } from "./table";

export const TransactionsPage: React.FC = () => (
    <Page title="Transactions">
        <TransactionsPageSummary />
        <TransactionsTable />
    </Page>
);
