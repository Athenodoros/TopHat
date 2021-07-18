import { makeStyles } from "@material-ui/core";
import React from "react";
import { Page, Section, SECTION_MARGIN } from "../../components/layout";
import { DataCountsDisplay } from "./DataCountsDisplay";
import { DataExports, DataImports } from "./DataImportExport";

const useStyles = makeStyles({
    container: {
        display: "flex",
    },
    left: {
        flex: "1 0 400px",
        paddingRight: SECTION_MARGIN,
    },
    right: {
        flex: "3 1 500px",
    },
});

export const DataPage: React.FC = () => {
    const classes = useStyles();

    return (
        <Page title="Data" padding={200}>
            <div className={classes.container}>
                <div className={classes.left}>
                    <DataCountsDisplay />
                    <DataExports />
                    <DataImports />
                </div>
                <Section title="Transaction Rules" className={classes.right}>
                    Transaction Rules
                </Section>
            </div>
        </Page>
    );
};
