import styled from "@emotion/styled";
import { Description } from "@mui/icons-material";
import { List, ListItemText, ListSubheader, MenuItem, TextField, Typography, typographyClasses } from "@mui/material";
import { Box } from "@mui/system";
import { groupBy, toPairs } from "lodash";
import { DateTime } from "luxon";
import React, { useMemo } from "react";
import { NonIdealState } from "../../components/display/NonIdealState";
import { getStatementIcon, useGetAccountIcon } from "../../components/display/ObjectDisplay";
import { ManagedDatePicker } from "../../components/inputs";
import { withSuppressEvent } from "../../shared/events";
import { TopHatDispatch } from "../../state";
import { AppSlice } from "../../state/app";
import { useDialogHasWorking, useDialogState } from "../../state/app/hooks";
import { Statement } from "../../state/data";
import { useAccountByID, useAccountMap, useAllStatements, useInstitutionMap } from "../../state/data/hooks";
import { PLACEHOLDER_STATEMENT_ID } from "../../state/data/shared";
import { parseDate } from "../../state/shared/values";
import { Greys } from "../../styles/colours";
import { DialogContents, DialogMain, DialogOptions, EditValueContainer } from "../shared";
import { DialogObjectOptionsBox, DialogSelectorAddNewButton, getUpdateFunctions, ObjectEditContainer } from "./shared";

export const DialogStatementView: React.FC = () => {
    const working = useDialogHasWorking();

    return (
        <DialogMain onClick={remove}>
            <StatementDialogObjectSelector render={render} />
            <DialogContents>
                {working ? (
                    <EditStatementView />
                ) : (
                    <NonIdealState
                        icon={Description}
                        title="Statements"
                        subtitle="Statements are export files, usually from an Institution, containing one row for each transaction or balance readings. Each is associated with one Account."
                    />
                )}
            </DialogContents>
        </DialogMain>
    );
};

const StatementBox = styled(Box)({
    display: "flex",
    alignItems: "center",
    minWidth: 0,
    flexShrink: 1,

    [`& .${typographyClasses.root}`]: {
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
    },
});
const FilledStatementIconSx = {
    height: 34,
    width: 34,
    marginRight: 15,
};
const render = (statement: Statement) => (
    <StatementBox>
        {getStatementIcon(statement, FilledStatementIconSx, true)}
        <ListItemText secondary={parseDate(statement.date).toLocaleString(DateTime.DATE_MED)}>
            <Typography noWrap={true}>{statement.name}</Typography>
        </ListItemText>
    </StatementBox>
);

const goToStatementImport = () => TopHatDispatch(AppSlice.actions.setDialogPage("import"));

const StatementDialogObjectSelector: React.FC<{ render: (statement: Statement) => JSX.Element }> = ({ render }) => {
    const selected = useDialogState("statement", (object) => object?.id);
    const statements = useAllStatements();
    const options = useMemo(() => {
        const filtered = statements.filter(({ id }) => id !== PLACEHOLDER_STATEMENT_ID);
        const grouped = groupBy(filtered, ({ account }) => account);
        return toPairs(grouped);
    }, [statements]);
    const institutions = useInstitutionMap();
    const accounts = useAccountMap();

    return (
        <DialogOptions>
            <DialogObjectOptionsBox>
                <List subheader={<div />}>
                    {options.map((group) => (
                        <SelectorContainerBox key={group[0]}>
                            <SelectorListSubheader>
                                {institutions[accounts[group[0]]!.institution]!.name} - {accounts[group[0]]!.name}
                            </SelectorListSubheader>
                            {group[1].map((option) => (
                                <SelectorMenuItem
                                    key={option.id}
                                    selected={option.id === selected}
                                    onClick={withSuppressEvent<HTMLLIElement>(() => set(option))}
                                >
                                    {render(option)}
                                </SelectorMenuItem>
                            ))}
                        </SelectorContainerBox>
                    ))}
                </List>
            </DialogObjectOptionsBox>
            <DialogSelectorAddNewButton type="statement" onClick={goToStatementImport} />
        </DialogOptions>
    );
};

const SelectorContainerBox = styled(Box)({ background: Greys[200] });
const SelectorListSubheader = styled(ListSubheader)({ background: Greys[200] });
const SelectorMenuItem = styled(MenuItem)({ padding: "6px 16px", width: "100%" });

const EditStatementView: React.FC = () => {
    const working = useDialogState("statement")!;

    const getAccountIcon = useGetAccountIcon();
    const account = useAccountByID(working.account);

    return (
        <ObjectEditContainer type="statement">
            <EditValueContainer label="Date">
                <ManagedDatePicker
                    value={working.date}
                    onChange={updateWorkingDate}
                    nullable={false}
                    disableFuture={true}
                    disableOpenPicker={true}
                    renderInput={(params) => <TextField {...params} size="small" label="Statement Date" />}
                />
            </EditValueContainer>
            <EditValueContainer label="Account">
                <AccountBox>
                    {getAccountIcon(account, IconSx)}
                    <Typography variant="body1">{account.name}</Typography>
                </AccountBox>
            </EditValueContainer>
        </ObjectEditContainer>
    );
};

const { update, remove, set } = getUpdateFunctions("statement");
const updateWorkingDate = update("date");

const AccountBox = styled(Box)({
    display: "flex",
    alignItems: "center",
    padding: 8,
    paddingRight: 15,
    borderRadius: "6px",
    background: Greys[200],
    border: "1px solid " + Greys[300],

    "& > p:last-child": {
        color: Greys[800],
    },
});
const IconSx = {
    width: 24,
    height: 24,
    marginRight: 10,
    borderRadius: "4px",
};
