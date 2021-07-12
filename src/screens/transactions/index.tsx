import React from "react";
import { Page } from "../../components/layout";
import { TransactionsPageSummary } from "./summary";

export const TransactionsPage: React.FC = () => (
    <Page title="Transactions">
        <TransactionsPageSummary />
    </Page>
);
