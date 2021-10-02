import { Page } from "../../components/layout";
import { CategoriesPageSummary } from "./summary";
import { CategoryTable } from "./table";

export const CategoriesPage: React.FC = () => {
    return (
        <Page title="Categories">
            <CategoriesPageSummary />
            <CategoryTable />
        </Page>
    );
};
