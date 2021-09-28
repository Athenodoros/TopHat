import { Clear, Help } from "@mui/icons-material";
import {
    alpha,
    Button,
    Card,
    Checkbox,
    FormControlLabel,
    IconButton,
    MenuItem,
    Step,
    StepContent,
    StepLabel,
    Stepper,
    Switch,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { useDialogState } from "../../../../state/app/hooks";
import {
    DialogStatementImportState,
    DialogStatementMappingState,
    DialogStatementParseState,
} from "../../../../state/app/statementTypes";
import { useAllCurrencies } from "../../../../state/data/hooks";
import {
    canChangeStatementMappingCurrencyType,
    canGoToStatementMappingScreen,
    canImportStatementsAndClearDialog,
    changeFileSelection,
    changeStatementMappingCurrencyField,
    changeStatementMappingCurrencyType,
    changeStatementMappingCurrencyValue,
    changeStatementMappingFlipValue,
    changeStatementMappingValue,
    changeStatementParsing,
    goBackToStatementMapping,
    goBackToStatementParsing,
    goToStatementImportScreen,
    goToStatementMappingScreen,
    importStatementsAndClearDialog,
    removeAllStatementFiles,
    removeStatementFileFromDialog,
    toggleStatementHasHeader,
} from "../../../../state/logic/statement";
import { StatementMappingColumns } from "../../../../state/logic/statement/parsing";
import { Greys, Intents, WHITE } from "../../../../styles/colours";
import { handleCheckboxChange, handleTextFieldChange, withSuppressEvent } from "../../../../utilities/events";
import { SubItemCheckbox } from "../../../inputs";
import { DialogContents, DialogMain, DialogOptions } from "../../utilities";
import { DialogImportAccountSelector } from "../utilities";
import { FileImportTableViewGrid } from "./table";

const useStyles = makeStyles({
    stepper: {
        padding: "20px 0 20px 15px",
        background: "transparent",
    },
    optionsContainer: {
        maxHeight: 220,
        overflowY: "auto",
    },
    option: {
        height: 40,
        display: "flex",
        marginRight: 19,
        // justifyContent: "space-between",
        alignItems: "center",
        "& p": { color: Greys[900] },
        "& > :first-child": { flexGrow: 1 },
    },
    delimiter: { width: 120 },
    dateFormat: { width: 120 },
    input: {
        marginTop: 4,
        "& .MuiInput-input": { textAlign: "center" },
    },
    title: {
        display: "flex",
        alignItems: "center",
        "& p": { marginRight: 3 },
    },

    mappingColumn: {
        width: 220,
        marginTop: 10,
    },
    nullColumn: {
        color: Greys[600],
        fontStyle: "italic",
    },
    mappingColumnHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 15,
        width: 220,
    },
    flipValuesCheckbox: {
        margin: 0,
    },

    actions: {
        display: "flex",
        float: "right",
        marginTop: 15,
        marginRight: 19,
        "& > *": {
            marginRight: 15,
        },
    },

    // Contents
    tabs: {
        background: WHITE,
        borderBottom: "1px solid " + Greys[400],
        flexShrink: 0,

        "& .MuiTab-root": {
            minHeight: 48,
            padding: "0 18px",
        },

        "& .MuiTab-wrapper": {
            flexDirection: "row-reverse",

            "& .MuiIconButton-root": { margin: "0 -5px 0 5px" },
        },
    },
    invalidTab: { color: Intents.danger.main },
    invalidButton: { color: alpha(Intents.danger.main, 0.6) },
    wrap: {
        overflow: "hidden",
        textOverflow: "ellipsis",
        maxWidth: 150,
    },
    showParsed: {
        marginTop: "auto",
        marginRight: 20,
        transform: "scale(0.8)",
        transformOrigin: "center right",
        color: Greys[900],
    },
});

const ScreenIDs = ["parse", "mapping", "import"] as const;
export const DialogImportScreen: React.FC = () => {
    const classes = useStyles();
    const state = useDialogState("import") as
        | DialogStatementParseState
        | DialogStatementMappingState
        | DialogStatementImportState;

    const currentFileParsed = state.columns.all[state.file].matches;
    const [showParsed, setShowParsed] = useState(currentFileParsed);
    useEffect(
        () => {
            if (!currentFileParsed) setShowParsed(false);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [state.file]
    );

    const [shouldRunRules, setShouldRunRules] = useState(true);
    const [shouldDetectTransfers, setShouldDetectTransfers] = useState(true);

    const currencies = useAllCurrencies();

    return (
        <DialogMain>
            <DialogOptions>
                <DialogImportAccountSelector />
                <Stepper activeStep={ScreenIDs.indexOf(state.page)} orientation="vertical" className={classes.stepper}>
                    <Step>
                        <StepLabel>File Parsing</StepLabel>
                        {state.page === "parse" ? (
                            <StepContent>
                                <div className={classes.optionsContainer}>
                                    <div className={classes.option}>
                                        <Typography variant="body2">Header Row</Typography>
                                        <Checkbox
                                            checked={state.parse.header}
                                            onClick={toggleStatementHasHeader}
                                            size="small"
                                            color="primary"
                                        />
                                    </div>
                                    <div className={classes.option}>
                                        <Typography variant="body2">Delimiter</Typography>
                                        <TextField
                                            placeholder=","
                                            size="small"
                                            value={state.parse.delimiter || ""}
                                            onChange={changeDelimiter}
                                            className={clsx(classes.delimiter, classes.input)}
                                        />
                                    </div>
                                    <div className={classes.option}>
                                        <div className={classes.title}>
                                            <Typography variant="body2">Date Format</Typography>
                                            <Tooltip title="See format strings">
                                                <IconButton
                                                    size="small"
                                                    href="https://github.com/moment/luxon/blob/master/docs/parsing.md#table-of-tokens"
                                                    target="_blank"
                                                >
                                                    <Help fontSize="small" htmlColor={Greys[500]} />
                                                </IconButton>
                                            </Tooltip>
                                        </div>
                                        <TextField
                                            placeholder="YYYY-MM-DD"
                                            size="small"
                                            value={state.parse.dateFormat || ""}
                                            onChange={changeDateFormat}
                                            className={clsx(classes.dateFormat, classes.input)}
                                        />
                                    </div>
                                </div>
                                <div className={classes.actions}>
                                    <Button
                                        color="secondary"
                                        variant="outlined"
                                        size="small"
                                        onClick={removeAllStatementFiles}
                                    >
                                        Back
                                    </Button>
                                    <Tooltip title={canGoToStatementMappingScreen(state) || ""}>
                                        <div>
                                            <Button
                                                color="primary"
                                                variant="contained"
                                                size="small"
                                                disabled={canGoToStatementMappingScreen(state) !== null}
                                                onClick={goToStatementMappingScreen}
                                            >
                                                Map Columns
                                            </Button>
                                        </div>
                                    </Tooltip>
                                </div>
                            </StepContent>
                        ) : undefined}
                    </Step>
                    <Step>
                        <StepLabel>Column Mapping</StepLabel>
                        {state.page === "mapping" ? (
                            <StepContent>
                                <div className={classes.optionsContainer}>
                                    <TextField
                                        select={true}
                                        value={state.mapping.date}
                                        onChange={onChangeMappingDate}
                                        size="small"
                                        className={classes.mappingColumn}
                                        label="Transaction Date"
                                    >
                                        {state.columns.common
                                            .filter(
                                                ({ type, nullable, id }) =>
                                                    type === "date" &&
                                                    !nullable &&
                                                    id !== (state.mapping.currency as { column: string }).column
                                            )
                                            .map(({ id, name }) => (
                                                <MenuItem key={id} value={id}>
                                                    {name}
                                                </MenuItem>
                                            ))}
                                    </TextField>
                                    <TextField
                                        select={true}
                                        value={state.mapping.reference || ""}
                                        onChange={onChangeMappingReference}
                                        size="small"
                                        className={classes.mappingColumn}
                                        label="Transaction Reference"
                                    >
                                        {state.columns.common
                                            .filter(({ type }) => type === "string")
                                            .map(({ id, name }) => (
                                                <MenuItem key={id} value={id}>
                                                    {name}
                                                </MenuItem>
                                            ))}
                                        <MenuItem value="" className={classes.nullColumn}>
                                            None
                                        </MenuItem>
                                    </TextField>
                                    <TextField
                                        select={true}
                                        value={state.mapping.balance || ""}
                                        onChange={onChangeMappingBalance}
                                        size="small"
                                        className={classes.mappingColumn}
                                        label="Account Balance"
                                    >
                                        {state.columns.common
                                            .filter(({ type }) => type === "number")
                                            .map(({ id, name }) => (
                                                <MenuItem key={id} value={id}>
                                                    {name}
                                                </MenuItem>
                                            ))}
                                        <MenuItem value="" className={classes.nullColumn}>
                                            None
                                        </MenuItem>
                                    </TextField>
                                    <div className={classes.mappingColumnHeader}>
                                        <Typography variant="subtitle2">Transaction Values</Typography>
                                        <Tooltip title="Split Credit/Debit columns">
                                            <div>
                                                <SubItemCheckbox
                                                    checked={state.mapping.value.type === "split"}
                                                    label="Split"
                                                    setChecked={changeMappingValueSplit}
                                                />
                                            </div>
                                        </Tooltip>
                                    </div>
                                    {state.mapping.value.type === "split" ? (
                                        <>
                                            <TextField
                                                select={true}
                                                value={state.mapping.value.credit || ""}
                                                onChange={onChangeMappingCredit}
                                                size="small"
                                                className={classes.mappingColumn}
                                                label="Transaction Credits"
                                            >
                                                {state.columns.common
                                                    .filter(({ type }) => type === "number")
                                                    .map(({ id, name }) => (
                                                        <MenuItem key={id} value={id}>
                                                            {name}
                                                        </MenuItem>
                                                    ))}
                                                <MenuItem value="" className={classes.nullColumn}>
                                                    None
                                                </MenuItem>
                                            </TextField>
                                            <TextField
                                                select={true}
                                                value={state.mapping.value.debit || ""}
                                                onChange={onChangeMappingDebit}
                                                size="small"
                                                className={classes.mappingColumn}
                                                label="Transaction Debits"
                                            >
                                                {state.columns.common
                                                    .filter(({ type }) => type === "number")
                                                    .map(({ id, name }) => (
                                                        <MenuItem key={id} value={id}>
                                                            {name}
                                                        </MenuItem>
                                                    ))}
                                                <MenuItem value="" className={classes.nullColumn}>
                                                    None
                                                </MenuItem>
                                            </TextField>
                                        </>
                                    ) : (
                                        <TextField
                                            select={true}
                                            value={state.mapping.value.value || ""}
                                            onChange={onChangeMappingValue}
                                            size="small"
                                            className={classes.mappingColumn}
                                            label="Transaction Value"
                                        >
                                            {state.columns.common
                                                .filter(({ type }) => type === "number")
                                                .map(({ id, name }) => (
                                                    <MenuItem key={id} value={id}>
                                                        {name}
                                                    </MenuItem>
                                                ))}
                                            <MenuItem value="" className={classes.nullColumn}>
                                                None
                                            </MenuItem>
                                        </TextField>
                                    )}
                                    <SubItemCheckbox
                                        checked={state.mapping.value.flip}
                                        setChecked={changeStatementMappingFlipValue}
                                        label={state.mapping.value.type === "value" ? "Flip Values" : "Flip Debits"}
                                        disabled={
                                            (state.mapping.value.type === "value"
                                                ? state.mapping.value.value
                                                : state.mapping.value.debit) === undefined
                                        }
                                        className={classes.flipValuesCheckbox}
                                        left={true}
                                    />
                                    <div className={classes.mappingColumnHeader}>
                                        <Typography variant="subtitle2">Currencies</Typography>
                                        <Tooltip
                                            title={
                                                canChangeStatementMappingCurrencyType()
                                                    ? "Currency from statement column"
                                                    : "No available string columns"
                                            }
                                        >
                                            <div>
                                                <SubItemCheckbox
                                                    disabled={!canChangeStatementMappingCurrencyType()}
                                                    checked={state.mapping.currency.type === "column"}
                                                    label="Variable"
                                                    setChecked={changeStatementMappingCurrencyType}
                                                />
                                            </div>
                                        </Tooltip>
                                    </div>
                                    {state.mapping.currency.type === "constant" ? (
                                        <TextField
                                            select={true}
                                            value={state.mapping.currency.currency}
                                            onChange={onChangeCurrencyValue}
                                            size="small"
                                            className={classes.mappingColumn}
                                            label="Transaction Currency"
                                        >
                                            {currencies.map(({ id, ticker }) => (
                                                <MenuItem key={id} value={id}>
                                                    {ticker}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    ) : (
                                        <>
                                            <TextField
                                                select={true}
                                                value={state.mapping.currency.column}
                                                onChange={onChangeCurrencyColumn}
                                                size="small"
                                                className={classes.mappingColumn}
                                                label="Currency Column"
                                            >
                                                {state.columns.common
                                                    .filter(({ type, nullable }) => type === "string" && !nullable)
                                                    .map(({ id, name }) => (
                                                        <MenuItem key={id} value={id}>
                                                            {name}
                                                        </MenuItem>
                                                    ))}
                                            </TextField>
                                            <TextField
                                                select={true}
                                                value={state.mapping.currency.field}
                                                onChange={onChangeCurrencyField}
                                                size="small"
                                                className={classes.mappingColumn}
                                                label="Matching Currency Field"
                                            >
                                                <MenuItem value="ticker">Ticker</MenuItem>
                                                <MenuItem value="symbol">Symbol</MenuItem>
                                                <MenuItem value="name">Name</MenuItem>
                                            </TextField>
                                        </>
                                    )}
                                </div>
                                <div className={classes.actions}>
                                    <Button
                                        color="secondary"
                                        variant="outlined"
                                        size="small"
                                        onClick={goBackToStatementParsing}
                                    >
                                        Back
                                    </Button>
                                    <Button
                                        color="primary"
                                        variant="contained"
                                        size="small"
                                        onClick={goToStatementImportScreen}
                                    >
                                        Filter Rows
                                    </Button>
                                </div>
                            </StepContent>
                        ) : undefined}
                    </Step>
                    <Step>
                        <StepLabel>Exclusions and Transfers</StepLabel>
                        <StepContent>
                            <div className={classes.optionsContainer}>
                                <div className={classes.option}>
                                    <Typography variant="body2">Include Transfers</Typography>
                                    <Checkbox
                                        checked={shouldDetectTransfers}
                                        onChange={handleCheckboxChange(setShouldDetectTransfers)}
                                        size="small"
                                        color="primary"
                                    />
                                </div>
                                <div className={classes.option}>
                                    <Typography variant="body2">Run Import Rules</Typography>
                                    <Checkbox
                                        checked={shouldRunRules}
                                        onChange={handleCheckboxChange(setShouldRunRules)}
                                        size="small"
                                        color="primary"
                                    />
                                </div>
                            </div>
                            <div className={classes.actions}>
                                <Button
                                    color="secondary"
                                    variant="outlined"
                                    size="small"
                                    onClick={goBackToStatementMapping}
                                >
                                    Back
                                </Button>
                                <Tooltip title={canImportStatementsAndClearDialog() || ""}>
                                    <div>
                                        <Button
                                            color="primary"
                                            variant="contained"
                                            size="small"
                                            onClick={() =>
                                                importStatementsAndClearDialog(shouldRunRules, shouldDetectTransfers)
                                            }
                                            disabled={canImportStatementsAndClearDialog() !== null}
                                        >
                                            Import Files
                                        </Button>
                                    </div>
                                </Tooltip>
                            </div>
                        </StepContent>
                    </Step>
                </Stepper>
            </DialogOptions>
            <DialogContents>
                {state.files.length > 1 ? (
                    <Tabs
                        value={state.file}
                        onChange={onFileChange}
                        variant="scrollable"
                        indicatorColor={currentFileParsed ? "primary" : "secondary"}
                        scrollButtons="auto"
                        className={classes.tabs}
                    >
                        {state.files.map((file) => (
                            <Tab
                                key={file.id}
                                label={<span className={classes.wrap}>{file.name}</span>}
                                value={file.id}
                                className={state.columns.all[file.id].matches ? undefined : classes.invalidTab}
                                icon={
                                    <IconButton
                                        size="small"
                                        onClick={withSuppressEvent<HTMLButtonElement>(() =>
                                            removeStatementFileFromDialog(file.id)
                                        )}
                                        className={
                                            state.columns.all[file.id].matches ? undefined : classes.invalidButton
                                        }
                                    >
                                        <Clear fontSize="small" />
                                    </IconButton>
                                }
                                component="div"
                                wrapped={true}
                            />
                        ))}
                    </Tabs>
                ) : undefined}
                {showParsed && state.columns.all[state.file].columns ? (
                    // <FileImportTableView columns={state.columns.all[state.file].columns!} />
                    <FileImportTableViewGrid transfers={shouldDetectTransfers} />
                ) : (
                    <FileDisplay contents={state.files.find((file) => file.id === state.file)!.contents} />
                )}
                <FormControlLabel
                    control={
                        <Switch
                            checked={showParsed}
                            onChange={handleCheckboxChange(setShowParsed)}
                            color="primary"
                            disabled={!currentFileParsed}
                        />
                    }
                    label="Show Parsed Transactions"
                    labelPlacement="start"
                    className={classes.showParsed}
                />
            </DialogContents>
        </DialogMain>
    );
};

const changeDelimiter = handleTextFieldChange((value) => changeStatementParsing({ delimiter: value || undefined }));
const changeDateFormat = handleTextFieldChange((value) => changeStatementParsing({ dateFormat: value || undefined }));
const onFileChange = (_: React.SyntheticEvent, id: string) => changeFileSelection(id);

const getOnChangeMapping = (key: keyof typeof StatementMappingColumns) =>
    handleTextFieldChange((value: string) => changeStatementMappingValue(key, value || undefined));
const onChangeMappingDate = getOnChangeMapping("date");
const onChangeMappingReference = getOnChangeMapping("reference");
const onChangeMappingBalance = getOnChangeMapping("balance");
const changeMappingValueSplit = (split: boolean) => changeStatementMappingValue(split ? "credit" : "value", undefined);
const onChangeMappingValue = getOnChangeMapping("value");
const onChangeMappingCredit = getOnChangeMapping("credit");
const onChangeMappingDebit = getOnChangeMapping("debit");
const onChangeCurrencyValue = handleTextFieldChange((value: string) =>
    changeStatementMappingCurrencyValue(Number(value))
);
const onChangeCurrencyColumn = getOnChangeMapping("currency");
const onChangeCurrencyField = handleTextFieldChange(changeStatementMappingCurrencyField as (value: string) => void);

const useFileDisplayStyles = makeStyles({
    card: {
        margin: "20px 20px 0 20px",
        padding: "10px 15px",
        overflow: "auto",

        "& > pre": { margin: 0 },
    },
});
const FileDisplay: React.FC<{ contents: string }> = ({ contents }) => (
    <Card variant="outlined" className={useFileDisplayStyles().card}>
        <pre>{contents}</pre>
    </Card>
);
