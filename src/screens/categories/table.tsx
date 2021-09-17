import { Card, FormControl, makeStyles, MenuItem, Select, Typography } from "@material-ui/core";
import numeral from "numeral";
import React from "react";
import { useCategoryGraph } from "../../components/display/CategoryMenu";
import { getCategoryIcon } from "../../components/display/ObjectDisplay";
import { Section } from "../../components/layout";
import { TopHatDispatch } from "../../state";
import { AppSlice } from "../../state/app";
import { useCategoriesPageState } from "../../state/app/hooks";
import { CategoriesPageState } from "../../state/app/pageTypes";
import { useCategoryByID } from "../../state/data/hooks";
import { ID } from "../../state/utilities/values";
import { Greys, Intents } from "../../styles/colours";
import { handleSelectChange } from "../../utilities/events";

export const CategoryTable: React.FC = () => {
    const { options, graph } = useCategoryGraph();
    const { metric, tableSign } = useCategoriesPageState();

    return (
        <Section
            title="All Categories"
            emptyBody={true}
            headers={[
                <FormControl variant="outlined" size="small" key="metric">
                    <Select value={metric} onChange={setMetric}>
                        <MenuItem value="previous">Last Month</MenuItem>
                        <MenuItem value="average">12 Month Average</MenuItem>
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
            {options.map((id) => (
                <TopLevelCategoryView key={id} id={id} graph={graph} />
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

// TODO: This will be the final function, I think
// const useTableData = () => {
//     return {
//         options: [] as { id: ID; budget: number; value: number }[], // Ordered
//         bounds: [0, 1200],
//         graph: { ... },
//     };
// };

const useTopLevelStyles = makeStyles({
    container: {
        position: "relative",
        overflow: "hidden",
        margin: "12px 0",
    },
    colour: {
        position: "absolute",
        width: 300,
        height: 280,
        borderRadius: 50,
        top: -180,
        left: -140,
        transform: "rotate(-20deg)",
        opacity: 0.1,
    },
    main: {
        display: "flex",
        height: 64,
        alignItems: "center",
    },
    title: {
        display: "flex",
        alignItems: "center",
        flexGrow: 1,
    },
    icon: {
        height: 20,
        width: 20,
        marginLeft: 30,
        marginRight: 20,
    },
    fillbar: {},
    total: {
        width: 250,
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "flex-end",
        marginRight: 40,
    },
    green: {
        color: Intents.success.main,
        lineHeight: 1,
    },
    red: {
        color: Intents.danger.main,
        lineHeight: 1,
    },
    budget: {
        color: Greys[700],
        marginLeft: 5,
    },
});
const TopLevelCategoryView: React.FC<{
    id: ID;
    graph: Record<number, number[]>;
}> = ({ id, graph }) => {
    const classes = useTopLevelStyles();
    const category = useCategoryByID(id);

    return (
        <Card className={classes.container}>
            <div className={classes.colour} style={{ background: category.colour }} />
            <div className={classes.main}>
                <div className={classes.title}>
                    {getCategoryIcon(category, classes.icon)}
                    <Typography variant="h5" noWrap={true}>
                        {category.name}
                    </Typography>
                </div>
                <div className={classes.fillbar}>
                    <Fillbar
                        value={Math.abs(category.transactions.debits[0] || category.transactions.credits[0] || 0)}
                        budget={1000}
                        domain={1200}
                        flip={!category.transactions.debits[0]}
                    />
                </div>
                <div className={classes.total}>
                    <Typography
                        variant="h5"
                        className={category.transactions.debits[0] <= 1000 ? classes.green : classes.red}
                    >
                        {numeral(category.transactions.debits[0]).format("$0,0.00")}
                    </Typography>
                    <Typography variant="caption" className={classes.budget}>
                        / 1,000.00
                    </Typography>
                </div>
            </div>
        </Card>
    );
};

const useFillbarStyles = makeStyles({
    container: {
        position: "relative",
        width: 300,
        height: 40,
        "& > *": {
            position: "absolute",
        },
    },
    outline: {
        top: 8,
        width: "100%",
        height: 24,
        border: "1px solid " + Greys[800],
        borderRadius: 12,
        overflow: "hidden",
    },
    filler: {
        height: "100%",
        opacity: 0.4,
    },
    value: {
        width: 3,
        height: 40,
        marginLeft: -1.5,
    },
    budget: {
        top: 2,
        width: 1.5,
        height: 36,
        background: Greys[600],
        marginLeft: -0.75,
    },
});
const Fillbar: React.FC<{ value: number; budget: number; domain: number; flip?: boolean }> = ({
    value,
    budget,
    domain,
    flip,
}) => {
    const classes = useFillbarStyles();

    return (
        <div className={classes.container}>
            <div className={classes.outline}>
                <div
                    className={classes.filler}
                    style={{
                        background: Intents[value < budget ? "success" : "danger"].light,
                        width: (value / domain) * 100 + "%",
                    }}
                />
            </div>
            <div
                className={classes.value}
                style={{
                    background: Intents[value < budget ? "success" : "danger"].main,
                    left: (value / domain) * 100 + "%",
                }}
            />
            <div
                className={classes.budget}
                style={{
                    left: (budget / domain) * 100 + "%",
                }}
            />
        </div>
    );
};
