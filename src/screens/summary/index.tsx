import { makeStyles } from "@material-ui/core";
import React from "react";
import { Page, Section, SECTION_MARGIN } from "../../components/layout";
import { Notifications } from "../../components/shell/notifications";
import { SummaryAssetsSection } from "./assets";
import { SummaryTransactionsSection } from "./transactions";

const useStyles = makeStyles({
    container: {
        display: "flex",
    },
    summaryColumn: {
        flexGrow: 1,
        marginRight: SECTION_MARGIN,

        "& > * > *:nth-child(2), & > * > *:nth-child(4)": {
            display: "flex",
        },
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

    return (
        <Page title="Welcome to TopHat!">
            <div className={classes.container}>
                <div className={classes.summaryColumn}>
                    <SummaryAssetsSection />
                    <SummaryTransactionsSection />
                </div>
                <Section title="Notifications" className={classes.notificationColumn}>
                    <Notifications />
                </Section>
            </div>
        </Page>
    );
};
