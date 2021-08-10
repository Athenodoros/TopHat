import { ListItemText, makeStyles, Typography } from "@material-ui/core";
import { Description, Event } from "@material-ui/icons";
import { KeyboardDatePicker } from "@material-ui/pickers";
import { MaterialUiPickersDate } from "@material-ui/pickers/typings/date";
import { DateTime } from "luxon";
import React, { useCallback } from "react";
import { TopHatDispatch } from "../../../state";
import { AppSlice } from "../../../state/app";
import { useDialogState } from "../../../state/app/hooks";
import { Statement } from "../../../state/data";
import { useAccountByID } from "../../../state/data/hooks";
import { PLACEHOLDER_STATEMENT_ID } from "../../../state/data/utilities";
import { formatDate, parseDate } from "../../../state/utilities/values";
import { Greys } from "../../../styles/colours";
import { getStatementIcon, useGetAccountIcon } from "../../display/ObjectDisplay";
import { DialogObjectEditWrapper, EditValueContainer, getUpdateFunctions, ObjectEditContainer } from "../utilities";

const useMainStyles = makeStyles({
    base: {
        display: "flex",
        alignItems: "center",
        paddingRight: 20,
        minWidth: 0,

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
    const render = useCallback(
        (statement: Statement) => (
            <div className={classes.base}>
                {getStatementIcon(statement, classes.icon, true)}
                <ListItemText secondary={parseDate(statement.date).toLocaleString(DateTime.DATE_MED)}>
                    {statement.name}
                </ListItemText>
            </div>
        ),
        [classes]
    );

    return (
        <DialogObjectEditWrapper
            type="statement"
            render={render}
            placeholder={Placeholder}
            exclude={[PLACEHOLDER_STATEMENT_ID]}
            onAddNew={goToStatementImport}
        >
            <EditStatementView />
        </DialogObjectEditWrapper>
    );
};

const goToStatementImport = () => TopHatDispatch(AppSlice.actions.setDialogPage("import"));

const Placeholder = {
    icon: Description,
    title: "Statements",
    subtext:
        "Statements are export files, usually from an Institution, containing one row for each transaction or balance readings. Each is associated with one Account.",
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
                <KeyboardDatePicker
                    value={working.date}
                    onChange={updateWorkingDate}
                    disableFuture={true}
                    format="yyyy-MM-dd"
                    inputVariant="outlined"
                    size="small"
                    label="Open Date"
                    KeyboardButtonProps={{ size: "small" }}
                    keyboardIcon={<Event fontSize="small" />}
                    clearable={true}
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

const { update } = getUpdateFunctions("statement");
const updateWorkingDate = (date: MaterialUiPickersDate) => update("date")(formatDate(date as DateTime));
