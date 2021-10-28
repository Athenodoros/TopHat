import styled from "@emotion/styled";
import { FormControlLabel, Switch } from "@mui/material";
import { useMemo } from "react";
import { Page, SECTION_MARGIN } from "../../components/layout";
import { TransactionsTable } from "../../components/table";
import {
    TransactionsTableFilters,
    TransactionsTableFixedDataState,
    TransactionsTableState,
} from "../../components/table/table/types";
import { TopHatDispatch } from "../../state";
import { AppSlice } from "../../state/app";
import { useCategoryPageCategory, useCategoryPageState } from "../../state/app/hooks";
import { useAllCategories } from "../../state/data/hooks";
import { CategoryPageBudgetSummary } from "./budget";
import { CategoryPageHeader } from "./header";
import { CategoryPageHistory } from "./history";

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

export const CategoryPage: React.FC = () => {
    const category = useCategoryPageCategory();
    const table = useCategoryPageState((state) => state.table);

    const hasChildren = useAllCategories().some(({ hierarchy }) => hierarchy.includes(category.id));

    const fixed: TransactionsTableFixedDataState = useMemo(
        () => ({ type: "category", category: category.id, nested: table.nested && hasChildren }),
        [category, table.nested, hasChildren]
    );

    return (
        <Page title="Categories">
            <CategoryPageHeader />
            <MiddleBox>
                <CategoryPageHistory />
                <CategoryPageBudgetSummary />
            </MiddleBox>
            <TransactionsTable
                filters={table.filters}
                state={table.state}
                setFilters={setFilters}
                setState={setState}
                fixed={fixed}
                headers={
                    hasChildren ? (
                        <FormControlLabel
                            control={<Switch checked={table.nested} onChange={handleToggle} />}
                            label="Include Subcategories"
                        />
                    ) : undefined
                }
            />
        </Page>
    );
};

const setFilters = (filters: TransactionsTableFilters) =>
    TopHatDispatch(AppSlice.actions.setCategoryTableStatePartial({ filters }));

const setState = (state: TransactionsTableState) =>
    TopHatDispatch(AppSlice.actions.setCategoryTableStatePartial({ state }));

const handleToggle = (event: React.ChangeEvent<HTMLInputElement>) =>
    TopHatDispatch(AppSlice.actions.setCategoryTableStatePartial({ nested: event.target.checked }));
