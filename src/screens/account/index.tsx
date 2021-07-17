import { Page, Section } from "../../components/layout";
import { useAccountPageState } from "../../state/app/hooks";
import { useAccountByID } from "../../state/data/hooks";

export const AccountPage: React.FC = () => {
    const id = useAccountPageState().account;
    const account = useAccountByID(id);

    return (
        <Page title="Accounts" padding={200}>
            <Section>Hello, {account.name}!</Section>
        </Page>
    );
};
