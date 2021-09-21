import { FormControl, MenuItem, Select } from "@material-ui/core";
import React from "react";
import { Section } from "../../../components/layout";
import { TopHatDispatch } from "../../../state";
import { AppSlice } from "../../../state/app";
import { useCategoriesPageState } from "../../../state/app/hooks";
import { CategoriesPageState } from "../../../state/app/pageTypes";
import { handleSelectChange } from "../../../utilities/events";
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
                <FormControl variant="outlined" size="small" key="metric">
                    <Select value={metric} onChange={setMetric}>
                        <MenuItem value="previous">Previous Month</MenuItem>
                        <MenuItem value="average">Average</MenuItem>
                    </Select>
                </FormControl>,
                <FormControl variant="outlined" size="small" key="sign">
                    <Select value={tableSign} onChange={setTableSign}>
                        <MenuItem value="all">All Categories</MenuItem>
                        <MenuItem value="debits">Expense Categories</MenuItem>
                        <MenuItem value="credits">Credit Categories</MenuItem>
                    </Select>
                </FormControl>,
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
