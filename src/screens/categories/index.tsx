import { Page, Section } from "../../components/layout";
import { CategoryTable } from "./table";

export const CategoriesPage: React.FC = () => {
    return (
        <Page title="Categories">
            <Section title="Budgets" />
            <CategoryTable />
        </Page>
    );
};
