import { makeStyles } from "@material-ui/core";
import { Page, Section, SECTION_MARGIN } from "../../components/layout";
import { AccountPageBalances } from "./balances";
import { AccountPageHeader } from "./header";

const useStyles = makeStyles({
    middle: {
        display: "flex",
        "& > div:first-child": {
            flex: "3 3 400px",
            marginRight: SECTION_MARGIN,
        },
        "& > div:last-child": {
            flex: "1 1 200px",
        },
    },
});

export const AccountPage: React.FC = () => {
    const classes = useStyles();

    return (
        <Page title="Accounts" padding={200}>
            <AccountPageHeader />
            <div className={classes.middle}>
                <AccountPageBalances />
                <Section title="Statements" />
            </div>
        </Page>
    );
};
