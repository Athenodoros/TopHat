import { ChevronRight } from "@mui/icons-material";
import { Button } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { Box } from "@mui/system";
import React from "react";
import { Notifications } from "../../app/notifications";
import { FlexWidthChart } from "../../components/display/FlexWidthChart";
import { Page, Section, SECTION_MARGIN } from "../../components/layout";
import {
    BalanceSnapshotSummaryNumbers,
    TransactionSnapshotSummaryNumbers,
    useAssetsSnapshot,
    useGetSummaryChart,
    useTransactionsSnapshot,
} from "../../components/snapshot";
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

        // This is the hard-coded height of the other panels on the page
        // A proper solution was beyond my CSS skills
        maxHeight: 725,

        "& > div": {
            padding: 0,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
        },
    },
});

export const SummaryPage: React.FC = () => {
    const classes = useStyles();
    const assetSummaryData = useAssetsSnapshot();
    const transactionSummaryData = useTransactionsSnapshot();

    const getAssetsChart = useGetSummaryChart(assetSummaryData);
    const getTransactionsChart = useGetSummaryChart(transactionSummaryData);

    return (
        <Page title="TopHat Finance">
            <div className={classes.container}>
                <div className={classes.summaryColumn}>
                    <Section title="Net Worth" headers={<SeeMore page="accounts" />}>
                        <Box sx={{ display: "flex", width: "100%", height: "100%" }}>
                            <div>
                                <BalanceSnapshotSummaryNumbers data={assetSummaryData} />
                            </div>
                            <FlexWidthChart style={{ flexGrow: 1 }} getChart={getAssetsChart} />
                        </Box>
                    </Section>
                    <Section title="Cash Flow" headers={<SeeMore page="transactions" />}>
                        <Box sx={{ display: "flex", width: "100%", height: "100%" }}>
                            <div>
                                <TransactionSnapshotSummaryNumbers data={transactionSummaryData} />
                            </div>
                            <FlexWidthChart style={{ flexGrow: 1 }} getChart={getTransactionsChart} />
                        </Box>
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
