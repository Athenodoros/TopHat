import makeStyles from '@mui/styles/makeStyles';
import { useMemo } from "react";
import { Page, Section, SECTION_MARGIN } from "../../components/layout";
import { TransactionsTable } from "../../components/table";
import { TransactionsTableFilters, TransactionsTableState } from "../../components/table/table/types";
import { TopHatDispatch } from "../../state";
import { AppSlice } from "../../state/app";
import { useCategoryPageCategory, useCategoryPageState } from "../../state/app/hooks";
import { CategoryPageBudgetSummary } from "./budget";
import { CategoryPageHeader } from "./header";

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

export const CategoryPage: React.FC = () => {
    const classes = useStyles();

    const category = useCategoryPageCategory();
    const table = useCategoryPageState((state) => state.table);
    const fixed = useMemo(() => ({ type: "category" as const, category: category.id }), [category]);
    const filters = useMemo(() => ({ ...table.filters, category: [category.id] }), [table.filters, category.id]);

    return (
        <Page title="Categories">
            <CategoryPageHeader />
            <div className={classes.middle}>
                <Section title="Transaction History" />
                <CategoryPageBudgetSummary />
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
    TopHatDispatch(AppSlice.actions.setCategoryTableStatePartial({ filters }));

const setState = (state: TransactionsTableState) =>
    TopHatDispatch(AppSlice.actions.setCategoryTableStatePartial({ state }));
