import { FormControl, MenuItem, Select } from "@material-ui/core";
import { max, mean } from "lodash";
import { Section } from "../../components/layout";
import { SummaryBarChart, SummaryBreakdown, SummarySection } from "../../components/summary";
import { SummaryChartSign } from "../../components/summary/utilities";
import { TopHatDispatch, TopHatStore } from "../../state";
import { AppSlice } from "../../state/app";
import { useTransactionsPageState } from "../../state/app/hooks";
import { TransactionsPageAggregations, TransactionsPageState } from "../../state/app/pageTypes";
import { Category, PLACEHOLDER_CATEGORY_ID } from "../../state/data";
import { useAllObjects, useInstitutionMap } from "../../state/data/hooks";
import { Account, Currency } from "../../state/data/types";
import { ID } from "../../state/utilities/values";
import { takeWithDefault, zipObject } from "../../utilities/data";
import { handleSelectChange } from "../../utilities/events";

export const TransactionsPageSummary: React.FC = () => {
    const aggregation = useTransactionsPageState((state) => state.chartAggregation);
    const sign = useTransactionsPageState((state) => state.chartSign);
    const data = useTransactionsSummaryData(aggregation);

    return (
        <SummarySection>
            <Section title="Transaction Summary" onClick={clearFilter}>
                <SummaryBreakdown
                    data={data}
                    sign={sign}
                    creditsName="Monthly Income"
                    debitsName="Monthly Expenses"
                    setFilter={setFilterID[aggregation]}
                />
            </Section>
            <Section
                title=""
                headers={[
                    <FormControl variant="outlined" size="small" key="aggregation">
                        <Select value={aggregation} onChange={setAggregation}>
                            <MenuItem value="account">By Account</MenuItem>
                            <MenuItem value="category">By Category</MenuItem>
                            <MenuItem value="currency">By Currency</MenuItem>
                        </Select>
                    </FormControl>,
                    <FormControl variant="outlined" size="small" key="sign">
                        <Select value={sign} onChange={setChartSign}>
                            <MenuItem value="all">All Transactions</MenuItem>
                            <MenuItem value="credits">Income</MenuItem>
                            <MenuItem value="debits">Expenses</MenuItem>
                        </Select>
                    </FormControl>,
                ]}
                onClick={clearFilter}
            >
                <SummaryBarChart
                    series={data}
                    sign={sign}
                    setFilter={setFilterID[aggregation]}
                    id={aggregation + sign}
                />
            </Section>
        </SummarySection>
    );
};

const setAggregation = handleSelectChange((chartAggregation: TransactionsPageState["chartAggregation"]) =>
    TopHatDispatch(AppSlice.actions.setTransactionsPagePartial({ chartAggregation }))
);

const setChartSign = handleSelectChange((chartSign: TransactionsPageState["chartSign"]) =>
    TopHatDispatch(AppSlice.actions.setTransactionsPagePartial({ chartSign }))
);

const getCategoryFilter = (category: ID): ID[] => {
    const { ids, entities } = TopHatStore.getState().data.category;
    const children = ids.filter((id) => entities[id]!.hierarchy.includes(category) || id === category);
    return children.length === 0 ? [category] : (children as ID[]);
};
const setFilterID = zipObject(
    TransactionsPageAggregations,
    TransactionsPageAggregations.map(
        (aggregation) => (id: number, sign?: SummaryChartSign, fromDate?: string, toDate?: string) =>
            TopHatDispatch(
                AppSlice.actions.setTransactionsPagePartial({
                    ...zipObject(
                        TransactionsPageAggregations,
                        TransactionsPageAggregations.map((_) => [])
                    ),
                    valueFrom: sign === "credits" ? 0 : undefined,
                    valueTo: sign === "debits" ? 0 : undefined,
                    [aggregation]: aggregation !== "category" ? [id] : getCategoryFilter(id),
                    fromDate,
                    toDate,
                })
            )
    )
);
const clearFilter = () =>
    TopHatDispatch(
        AppSlice.actions.setTransactionsPagePartial({
            ...zipObject(
                TransactionsPageAggregations,
                TransactionsPageAggregations.map((_) => [])
            ),
            fromDate: undefined,
            toDate: undefined,
            valueFrom: undefined,
            valueTo: undefined,
        })
    );

const useTransactionsSummaryData = (aggregation: TransactionsPageState["chartAggregation"]) => {
    let objects = useAllObjects(aggregation);
    if (aggregation === "category") {
        objects = objects.filter((category) => (category as Category).hierarchy.length === 0);
    }

    const institutions = useInstitutionMap();

    const length = Math.min(
        max(objects.flatMap((_) => [_.transactions.credits.length, _.transactions.debits.length])) || 24,
        24
    );

    return objects.map((object) => {
        const credits = takeWithDefault(object.transactions.credits, length, 0);
        const debits = takeWithDefault(object.transactions.debits, length, 0);

        const colour =
            aggregation === "account"
                ? institutions[(object as Account).institution!]!.colour
                : (object as Exclude<typeof objects[number], Account>).colour;

        return {
            id: object.id,
            name: aggregation === "currency" ? (object as Currency).ticker : object.name,
            colour,
            trend: { credits, debits },
            value: { credit: mean(credits), debit: mean(debits) },
            placeholder: aggregation === "category" && object.id === PLACEHOLDER_CATEGORY_ID,
        };
    });
};
