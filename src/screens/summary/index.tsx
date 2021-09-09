import { Button, makeStyles } from "@material-ui/core";
import { ChevronRight } from "@material-ui/icons";
import React from "react";
import { Page, Section, SECTION_MARGIN } from "../../components/layout";
import { Notifications } from "../../components/shell/notifications";
import { SnapshotSectionContents, useAssetsSnapshot, useTransactionsSnapshot } from "../../components/snapshot";
import { OpenPageCache } from "../../state/app/actions";
import { PageStateType } from "../../state/app/pageTypes";

const useStyles = makeStyles({
    container: {
        display: "flex",
    },
    summaryColumn: {
        flexGrow: 1,
        marginRight: SECTION_MARGIN,
    },
    notificationColumn: {
        flexShrink: 0,
        alignSelf: "flex-start",

        "& > div": {
            padding: 0,
        },
    },
});

export const SummaryPage: React.FC = () => {
    const classes = useStyles();
    const assetSummaryData = useAssetsSnapshot();
    const transactionSummaryData = useTransactionsSnapshot();

    return (
        <Page title="Welcome to TopHat!">
            <div className={classes.container}>
                <div className={classes.summaryColumn}>
                    <Section title="Net Worth" headers={<SeeMore page="accounts" />}>
                        <SnapshotSectionContents data={assetSummaryData} />
                    </Section>
                    <Section title="Cash Flow" headers={<SeeMore page="transactions" />}>
                        <SnapshotSectionContents data={transactionSummaryData} />
                    </Section>
                </div>
                <Section title="Notifications" className={classes.notificationColumn}>
                    <Notifications />
                </Section>
            </div>
        </Page>
    );
};

const SeeMore: React.FC<{ page: PageStateType["id"] }> = ({ page }) => (
    <Button endIcon={<ChevronRight />} onClick={OpenPageCache[page]} size="small">
        See More
    </Button>
);
