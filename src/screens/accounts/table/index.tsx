import { FormControlLabel, Switch } from "@material-ui/core";
import React from "react";
import { TableContainer } from "../../../components/table";
import { TopHatDispatch } from "../../../state";
import { AppSlice } from "../../../state/app";
import { useAccountsPageState } from "../../../state/app/hooks";
import { useAccountsTableData } from "./data";
import { AccountsTableHeader } from "./header";
import { AccountsInstitutionDisplay } from "./institution";

export const AccountsTable: React.FC = () => {
    const filterInactive = useAccountsPageState((state) => state.filterInactive);
    const institutions = useAccountsTableData();

    return (
        <TableContainer
            title="All Accounts"
            headers={
                <FormControlLabel
                    control={<Switch checked={filterInactive} onChange={handleToggle} color="primary" />}
                    label="Filter Inactive"
                />
            }
        >
            <AccountsTableHeader />
            {institutions.map((institution) => (
                <AccountsInstitutionDisplay key={institution.id || "missing"} institution={institution} />
            ))}
        </TableContainer>
    );
};

const handleToggle = (_: any, filterInactive: boolean) =>
    TopHatDispatch(AppSlice.actions.setAccountsPagePartial({ filterInactive }));
