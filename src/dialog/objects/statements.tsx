import { Description } from "@mui/icons-material";
import { List, ListItemText, ListSubheader, MenuItem, TextField, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { groupBy, toPairs } from "lodash";
import { DateTime } from "luxon";
import React, { useCallback, useMemo } from "react";
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
import {
    DialogContents,
    DialogMain,
    DialogOptions,
    DialogSelectorAddNewButton,
    EditValueContainer,
    getUpdateFunctions,
    ObjectEditContainer,
    useDialogObjectSelectorStyles,
} from "../shared";

const useMainStyles = makeStyles({
    base: {
        display: "flex",
        alignItems: "center",
        minWidth: 0,
        flexShrink: 1,

        "& .MuiTypography-root": {
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
        },
    },
    icon: {
        height: 34,
        width: 34,
        marginRight: 15,
    },
});

export const DialogStatementView: React.FC = () => {
    const classes = useMainStyles();
    const working = useDialogHasWorking();
    const render = useCallback(
        (statement: Statement) => (
            <div className={classes.base}>
                {getStatementIcon(statement, classes.icon, true)}
                <ListItemText secondary={parseDate(statement.date).toLocaleString(DateTime.DATE_MED)}>
                    <Typography noWrap={true}>{statement.name}</Typography>
                </ListItemText>
            </div>
        ),
        [classes]
    );

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

const goToStatementImport = () => TopHatDispatch(AppSlice.actions.setDialogPage("import"));

const useSelectorClasses = makeStyles({
    container: { background: Greys[200] },
    subheader: { background: Greys[200] },
    item: { padding: "6px 16px", width: "100%" },
});

const StatementDialogObjectSelector: React.FC<{ render: (statement: Statement) => JSX.Element }> = ({ render }) => {
    const classes = useDialogObjectSelectorStyles();
    const selectorClasses = useSelectorClasses();
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
            <div className={classes.options}>
                <List subheader={<div />}>
                    {options.map((group) => (
                        <div key={group[0]} className={selectorClasses.container}>
                            <ListSubheader className={selectorClasses.subheader}>
                                {institutions[accounts[group[0]]!.institution]!.name} - {accounts[group[0]]!.name}
                            </ListSubheader>
                            {group[1].map((option) => (
                                <MenuItem
                                    key={option.id}
                                    className={selectorClasses.item}
                                    selected={option.id === selected}
                                    onClick={withSuppressEvent<HTMLLIElement>(() => set(option))}
                                >
                                    {render(option)}
                                </MenuItem>
                            ))}
                        </div>
                    ))}
                </List>
            </div>
            <DialogSelectorAddNewButton type="statement" onClick={goToStatementImport} />
        </DialogOptions>
    );
};

const useEditViewStyles = makeStyles((theme) => ({
    account: {
        display: "flex",
        alignItems: "center",
        padding: 8,
        paddingRight: 15,
        borderRadius: 6,
        background: Greys[200],
        border: "1px solid " + Greys[300],

        "& > p:last-child": {
            color: Greys[800],
        },
    },
    icon: {
        width: 24,
        height: 24,
        marginRight: 10,
        borderRadius: 4,
    },
}));
const EditStatementView: React.FC = () => {
    const classes = useEditViewStyles();
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
                <div className={classes.account}>
                    {getAccountIcon(account, classes.icon)}
                    <Typography variant="body1">{account.name}</Typography>
                </div>
            </EditValueContainer>
        </ObjectEditContainer>
    );
};

const { update, remove, set } = getUpdateFunctions("statement");
const updateWorkingDate = update("date");
