import { Page } from "../../components/layout";
import { AccountsPageSummary } from "./summary";
import { AccountsTable } from "./table";

export const AccountsPage: React.FC = () => (
    <Page title="Accounts">
        <AccountsPageSummary />
        <AccountsTable />
    </Page>
);
