import { MenuItem, Select } from "@mui/material";
import React from "react";
import { Section } from "../../../components/layout";
import { handleSelectChange } from "../../../shared/events";
import { TopHatDispatch } from "../../../state";
import { AppSlice } from "../../../state/app";
import { useCategoriesPageState } from "../../../state/app/hooks";
import { CategoriesPageState } from "../../../state/app/pageTypes";
import { useCategoriesTableData } from "./data";
import { TopLevelCategoryTableView } from "./TopLevel";

export const CategoryTable: React.FC = () => {
    const { metric, tableSign } = useCategoriesPageState();
    const { options, graph, chartFunctions, getCategoryStatistics } = useCategoriesTableData(metric, tableSign);

    return (
        <Section
            title="All Categories"
            emptyBody={true}
            headers={[
                <Select value={metric} onChange={setMetric} size="small" key="metric">
                    <MenuItem value="previous">Previous Month</MenuItem>
                    <MenuItem value="average">12 Month Average</MenuItem>
                </Select>,
                <Select value={tableSign} onChange={setTableSign} size="small" key="sign">
                    <MenuItem value="all">All Categories</MenuItem>
                    <MenuItem value="debits">Expense Categories</MenuItem>
                    <MenuItem value="credits">Credit Categories</MenuItem>
                </Select>,
            ]}
        >
            {options.map((option) => (
                <TopLevelCategoryTableView
                    key={option.id}
                    category={option}
                    graph={graph}
                    chartFunctions={chartFunctions}
                    getCategoryStatistics={getCategoryStatistics}
                />
            ))}
        </Section>
    );
};

const setMetric = handleSelectChange((metric: CategoriesPageState["metric"]) =>
    TopHatDispatch(AppSlice.actions.setCategoriesPagePartial({ metric }))
);
const setTableSign = handleSelectChange((tableSign: CategoriesPageState["tableSign"]) =>
    TopHatDispatch(AppSlice.actions.setCategoriesPagePartial({ tableSign }))
);
