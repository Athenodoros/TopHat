import { makeStyles } from "@material-ui/core";
import { Page, Section, SECTION_MARGIN } from "../../components/layout";
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

    return (
        <Page title="Categories">
            <CategoryPageHeader />
            <div className={classes.middle}>
                <Section title="Transaction History" />
                <CategoryPageBudgetSummary />
            </div>
        </Page>
    );
};
