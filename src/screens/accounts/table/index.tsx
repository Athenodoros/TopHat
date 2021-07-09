import { FormControlLabel, makeStyles, Switch } from "@material-ui/core";
import React from "react";
import { Section } from "../../../components/layout";
import { TopHatDispatch } from "../../../state";
import { AppSlice } from "../../../state/app";
import { useAccountsPageState } from "../../../state/app/hooks";
import { useAccountsTableData } from "./data";
import { AccountsTableHeader } from "./header";
import { AccountsInstitutionDisplay } from "./institution";

const useStyles = makeStyles({
    section: {
        marginBottom: 100,

        "& > div:first-child": {
            zIndex: 2,
        },
    },
});

export const AccountsTable: React.FC = () => {
    const filterInactive = useAccountsPageState((state) => state.filterInactive);
    const institutions = useAccountsTableData();
    const classes = useStyles();

    return (
        <Section
            title="All Accounts"
            headers={
                <FormControlLabel
                    control={<Switch checked={filterInactive} onChange={handleToggle} color="primary" />}
                    label="Filter Inactive"
                />
            }
            emptyBody={true}
            className={classes.section}
        >
            <AccountsTableHeader />
            {institutions.map((institution) => (
                <AccountsInstitutionDisplay key={institution.id || "missing"} institution={institution} />
            ))}
        </Section>
    );
};

const handleToggle = (_: any, filterInactive: boolean) =>
    TopHatDispatch(AppSlice.actions.setAccountsPagePartial({ filterInactive }));
