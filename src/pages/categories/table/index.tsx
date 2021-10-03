import { MenuItem, Select } from "@mui/material";
import React from "react";
import { TableContainer } from "../../../components/table";
import { handleSelectChange } from "../../../shared/events";
import { TopHatDispatch } from "../../../state";
import { AppSlice } from "../../../state/app";
import { useCategoriesPageState } from "../../../state/app/hooks";
import { CategoriesPageState } from "../../../state/app/pageTypes";
import { useCategoriesTableData } from "./data";
import { CategoriesPageTableHeader } from "./header";
import { TopLevelCategoryTableView } from "./TopLevel";

export const CategoryTable: React.FC = () => {
    const { hideEmpty, tableMetric: metric, tableSign } = useCategoriesPageState();
    const { options, graph, chartFunctions, getCategoryStatistics } = useCategoriesTableData(
        hideEmpty,
        metric,
        tableSign
    );

    return (
        <TableContainer
            title="All Categories"
            headers={
                <Select value={metric} onChange={setMetric} size="small">
                    <MenuItem value="current">Current Month</MenuItem>
                    <MenuItem value="previous">Previous Month</MenuItem>
                    <MenuItem value="average">12 Month Average</MenuItem>
                </Select>
            }
        >
            <CategoriesPageTableHeader tableSign={tableSign} hideEmpty={hideEmpty} />
            {options.map((option) => (
                <TopLevelCategoryTableView
                    key={option.id}
                    category={option}
                    graph={graph}
                    chartFunctions={chartFunctions}
                    getCategoryStatistics={getCategoryStatistics}
                    hideEmpty={hideEmpty}
                />
            ))}
        </TableContainer>
    );
};

const setMetric = handleSelectChange((tableMetric: CategoriesPageState["tableMetric"]) =>
    TopHatDispatch(AppSlice.actions.setCategoriesPagePartial({ tableMetric }))
);
