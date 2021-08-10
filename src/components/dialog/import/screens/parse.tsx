import { Button, IconButton, makeStyles, Radio, Switch, TextField, Tooltip, Typography } from "@material-ui/core";
import { Clear, Help, KeyboardArrowDown } from "@material-ui/icons";
import clsx from "clsx";
import { useCallback, useState } from "react";
import { TopHatDispatch } from "../../../../state";
import { AppSlice } from "../../../../state/app";
import { DefaultDialogs } from "../../../../state/app/defaults";
import { useDialogState } from "../../../../state/app/hooks";
import { DialogStatementParseState } from "../../../../state/app/statementTypes";
import {
    canGoToStatementMappingScreen,
    changeFileSelection,
    changeStatementParsing,
    goToStatementMappingScreen,
    removeStatementFileFromDialog,
} from "../../../../state/logic/statement";
import { Greys, WHITE } from "../../../../styles/colours";
import { handleTextFieldChange, withSuppressEvent } from "../../../../utilities/events";
import { DialogContents, DialogMain, DialogOptions } from "../../utilities";
import { DialogImportAccountSelector, DialogImportButtons, DialogImportTitle } from "../utilities";

const useStyles = makeStyles((theme) => ({
    options: {
        position: "relative",
        margin: "0 30px auto 30px",
    },
    optionsButton: {
        position: "absolute",
        display: "flex",
        color: Greys[500],
        textTransform: "uppercase",
        cursor: "pointer",

        "& svg": { marginleft: 10 },
    },
    transition: { transition: theme.transitions.create("opacity") },
    open: { opacity: 1 },
    closed: { opacity: 0, pointerEvents: "none" },
    option: {
        height: 33,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 5,
        "& h6": { color: Greys[700] },

        "&:first-child": { marginTop: 0 },
    },
    title: {
        display: "flex",
        alignItems: "center",
        "& h6": {
            marginRight: 3,
        },
    },
    delimiter: { width: 50 },
    dateFormat: { width: 130 },
    input: {
        marginTop: 4,
        "& .MuiInput-underline": {
            "&::before": { border: "none !important" },
            "& input": { textAlign: "center" },
        },
    },
    forwardContainer: { display: "flex" },
    files: {
        display: "flex",
        flexDirection: "column",
        margin: "0 20px",
        overflow: "scroll",
    },
    file: {
        background: WHITE,
        borderRadius: 15,
        cursor: "pointer",
        marginBottom: 5,
        padding: "0 5px 0 0",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        textTransform: "inherit",

        "& p": { flexGrow: 1, marginRight: 10 },
    },
    selectedFile: {
        "& p": { fontWeight: 500 },
    },
}));

export const DialogImportParseScreen: React.FC = () => {
    const classes = useStyles();
    const state = useDialogState("import") as DialogStatementParseState;
    const [showOptions, setShowOptions] = useState(false);

    const toggleHeader = useCallback(
        () => changeStatementParsing({ header: !state.parse.header }),
        [state.parse.header]
    );

    const canGoForward = canGoToStatementMappingScreen(state);
    const GoForwardButton = (
        <Button onClick={goToStatementMappingScreen} variant="outlined" color="primary" disabled={!canGoForward}>
            Next
        </Button>
    );

    return (
        <DialogMain>
            <DialogOptions>
                <DialogImportAccountSelector />
                <DialogImportTitle title="Parsing" />
                <div className={classes.options}>
                    <div
                        className={clsx(
                            classes.optionsButton,
                            classes.transition,
                            showOptions ? classes.closed : classes.open
                        )}
                        onClick={() => setShowOptions(true)}
                    >
                        <Typography variant="subtitle2">Show Parsing Options</Typography>
                        <KeyboardArrowDown fontSize="small" htmlColor={Greys[400]} />
                    </div>
                    <div className={clsx(classes.transition, showOptions ? classes.open : classes.closed)}>
                        <div className={classes.option}>
                            <Typography variant="subtitle2">Header Row</Typography>
                            <Switch checked={state.parse.header} onClick={toggleHeader} size="small" color="primary" />
                        </div>
                        <div className={classes.option}>
                            <Typography variant="subtitle2">Delimiter</Typography>
                            <TextField
                                // variant="outlined"
                                placeholder=","
                                size="small"
                                value={state.parse.delimiter || ""}
                                onChange={changeDelimiter}
                                className={clsx(classes.delimiter, classes.input)}
                            />
                        </div>
                        <div className={classes.option}>
                            <div className={classes.title}>
                                <Typography variant="subtitle2">Date Format</Typography>
                                <Tooltip title="See format strings">
                                    <IconButton
                                        size="small"
                                        href="https://github.com/moment/luxon/blob/master/docs/parsing.md#table-of-tokens"
                                    >
                                        <Help fontSize="small" htmlColor={Greys[500]} />
                                    </IconButton>
                                </Tooltip>
                            </div>
                            <TextField
                                // variant="outlined"
                                placeholder="YYYY-MM-DD"
                                size="small"
                                value={state.parse.dateFormat || ""}
                                onChange={changeDateFormat}
                                className={clsx(classes.dateFormat, classes.input)}
                            />
                        </div>
                    </div>
                </div>
                {state.files.length > 1 ? (
                    <>
                        {/* <DialogImportTitle title="Files" /> */}
                        <div className={classes.files}>
                            {state.files.map(({ id, name }) => (
                                <Button
                                    key={id}
                                    className={clsx(classes.file, state.file === id && classes.selectedFile)}
                                    color={state.columns.all[id].matches ? "primary" : "secondary"}
                                    onClick={() => changeFileSelection(id)}
                                    component="div"
                                >
                                    <Radio
                                        size="small"
                                        color={state.columns.all[id].matches ? "primary" : "secondary"}
                                        checked={state.file === id}
                                    />
                                    <Typography variant="body2" noWrap={true}>
                                        {name}
                                    </Typography>
                                    <IconButton
                                        size="small"
                                        onClick={withSuppressEvent<HTMLButtonElement>(() =>
                                            removeStatementFileFromDialog(id)
                                        )}
                                        // color={state.columns.all[id].matches ? "primary" : "secondary"}
                                    >
                                        <Clear fontSize="small" />
                                    </IconButton>
                                </Button>
                            ))}
                        </div>
                    </>
                ) : undefined}
                <DialogImportButtons>
                    <Button onClick={goBack} variant="outlined" color="primary">
                        Back
                    </Button>
                    {canGoForward ? (
                        GoForwardButton
                    ) : (
                        <Tooltip title="All files need to be parsed correctly">
                            <span className={classes.forwardContainer}>{GoForwardButton}</span>
                        </Tooltip>
                    )}
                </DialogImportButtons>
            </DialogOptions>
            <DialogContents></DialogContents>
        </DialogMain>
    );
};

const changeDelimiter = handleTextFieldChange((value) => changeStatementParsing({ delimiter: value || undefined }));
const changeDateFormat = handleTextFieldChange((value) => changeStatementParsing({ dateFormat: value || undefined }));
const goBack = () => TopHatDispatch(AppSlice.actions.setDialogPartial({ import: DefaultDialogs.import }));
