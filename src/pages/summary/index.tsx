import styled from "@emotion/styled";
import { ChevronRight } from "@mui/icons-material";
import { Button } from "@mui/material";
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

export const SummaryPage: React.FC = () => {
    const assetSummaryData = useAssetsSnapshot();
    const transactionSummaryData = useTransactionsSnapshot();

    const getAssetsChart = useGetSummaryChart(assetSummaryData);
    const getTransactionsChart = useGetSummaryChart(transactionSummaryData);

    return (
        <Page title="TopHat Finance">
            <ContainerBox>
                <SummaryColumnBox>
                    <Section title="Net Worth" headers={<SeeMore page="accounts" />}>
                        <SummaryContainer>
                            <div>
                                <BalanceSnapshotSummaryNumbers data={assetSummaryData} />
                            </div>
                            <FlexWidthChart style={{ flexGrow: 1 }} getChart={getAssetsChart} />
                        </SummaryContainer>
                    </Section>
                    <Section title="Cash Flow" headers={<SeeMore page="transactions" />}>
                        <SummaryContainer>
                            <div>
                                <TransactionSnapshotSummaryNumbers data={transactionSummaryData} />
                            </div>
                            <FlexWidthChart sx={{ flexGrow: 1 }} getChart={getTransactionsChart} />
                        </SummaryContainer>
                    </Section>
                </SummaryColumnBox>
                <Section title="Notifications" sx={NotificationColumnSx}>
                    <Notifications />
                </Section>
            </ContainerBox>
        </Page>
    );
};

const SeeMore: React.FC<{ page: PageStateType["id"] }> = ({ page }) => (
    <Button endIcon={<ChevronRight />} onClick={OpenPageCache[page]} size="small">
        See More
    </Button>
);

const ContainerBox = styled("div")({ display: "flex" });
const SummaryColumnBox = styled("div")({ flexGrow: 1, marginRight: SECTION_MARGIN });
const SummaryContainer = styled("div")({ display: "flex", width: "100%", height: "100%" });
const NotificationColumnSx = {
    flexShrink: 0,
    alignSelf: "flex-start",

    // This is the hard-coded height of the other panels on the page
    // A proper solution was beyond my CSS skills
    maxHeight: 725,

    "& > div": {
        padding: 0,
        minHeight: 0,
        display: "flex",
    },
};
