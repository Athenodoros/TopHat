import styled from "@emotion/styled";
import { Button, MenuItem, StepContent, TextField, Tooltip, Typography } from "@mui/material";
import { SubItemCheckbox } from "../../../components/inputs";
import { handleTextFieldChange } from "../../../shared/events";
import { DialogStatementMappingState } from "../../../state/app/statementTypes";
import { useAllCurrencies } from "../../../state/data/hooks";
import {
    canChangeStatementMappingCurrencyType,
    canGoToStatementImportScreen,
    changeStatementMappingCurrencyField,
    changeStatementMappingCurrencyType,
    changeStatementMappingCurrencyValue,
    changeStatementMappingFlipValue,
    changeStatementMappingValue,
    goBackToStatementParsing,
    goToStatementImportScreen,
} from "../../../state/logic/statement";
import { StatementMappingColumns } from "../../../state/logic/statement/parsing";
import { Greys } from "../../../styles/colours";
import { DialogImportActionsBox, DialogImportOptionsContainerBox } from "./shared";

export const DialogImportMappingStepContent: React.FC<{ state: DialogStatementMappingState }> = ({ state }) => {
    const currencies = useAllCurrencies();
    const canProgressToImportScreen = canGoToStatementImportScreen(state, currencies);

    return (
        <StepContent>
            <DialogImportOptionsContainerBox>
                <MappingColumnTextField
                    select={true}
                    value={state.mapping.date}
                    onChange={onChangeMappingDate}
                    size="small"
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
                </MappingColumnTextField>
                <MappingColumnTextField
                    select={true}
                    value={state.mapping.reference || ""}
                    onChange={onChangeMappingReference}
                    size="small"
                    label="Transaction Reference"
                >
                    {state.columns.common
                        .filter(({ type }) => type === "string")
                        .map(({ id, name }) => (
                            <MenuItem key={id} value={id}>
                                {name}
                            </MenuItem>
                        ))}
                    {NullColumnMenuItem}
                </MappingColumnTextField>
                <MappingColumnTextField
                    select={true}
                    value={state.mapping.longReference || ""}
                    onChange={onChangeMappingLongReference}
                    size="small"
                    label="Long Description"
                >
                    {state.columns.common
                        .filter(({ type }) => type === "string")
                        .map(({ id, name }) => (
                            <MenuItem key={id} value={id}>
                                {name}
                            </MenuItem>
                        ))}
                    {NullColumnMenuItem}
                </MappingColumnTextField>
                <MappingColumnTextField
                    select={true}
                    value={state.mapping.balance || ""}
                    onChange={onChangeMappingBalance}
                    size="small"
                    label="Account Balance"
                >
                    {state.columns.common
                        .filter(({ type }) => type === "number")
                        .map(({ id, name }) => (
                            <MenuItem key={id} value={id}>
                                {name}
                            </MenuItem>
                        ))}
                    {NullColumnMenuItem}
                </MappingColumnTextField>
                <MappingColumnHeaderBox>
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
                </MappingColumnHeaderBox>
                {state.mapping.value.type === "split" ? (
                    <>
                        <MappingColumnTextField
                            select={true}
                            value={state.mapping.value.credit || ""}
                            onChange={onChangeMappingCredit}
                            size="small"
                            label="Transaction Credits"
                        >
                            {state.columns.common
                                .filter(({ type }) => type === "number")
                                .map(({ id, name }) => (
                                    <MenuItem key={id} value={id}>
                                        {name}
                                    </MenuItem>
                                ))}
                            {NullColumnMenuItem}
                        </MappingColumnTextField>
                        <MappingColumnTextField
                            select={true}
                            value={state.mapping.value.debit || ""}
                            onChange={onChangeMappingDebit}
                            size="small"
                            label="Transaction Debits"
                        >
                            {state.columns.common
                                .filter(({ type }) => type === "number")
                                .map(({ id, name }) => (
                                    <MenuItem key={id} value={id}>
                                        {name}
                                    </MenuItem>
                                ))}
                            {NullColumnMenuItem}
                        </MappingColumnTextField>
                    </>
                ) : (
                    <MappingColumnTextField
                        select={true}
                        value={state.mapping.value.value || ""}
                        onChange={onChangeMappingValue}
                        size="small"
                        label="Transaction Value"
                    >
                        {state.columns.common
                            .filter(({ type }) => type === "number")
                            .map(({ id, name }) => (
                                <MenuItem key={id} value={id}>
                                    {name}
                                </MenuItem>
                            ))}
                        {NullColumnMenuItem}
                    </MappingColumnTextField>
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
                    sx={FlipValuesCheckboxSx}
                    left={true}
                />
                <MappingColumnHeaderBox>
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
                </MappingColumnHeaderBox>
                {state.mapping.currency.type === "constant" ? (
                    <MappingColumnTextField
                        select={true}
                        value={state.mapping.currency.currency}
                        onChange={onChangeCurrencyValue}
                        size="small"
                        label="Transaction Currency"
                    >
                        {currencies.map(({ id, ticker }) => (
                            <MenuItem key={id} value={id}>
                                {ticker}
                            </MenuItem>
                        ))}
                    </MappingColumnTextField>
                ) : (
                    <>
                        <MappingColumnTextField
                            select={true}
                            value={state.mapping.currency.column}
                            onChange={onChangeCurrencyColumn}
                            size="small"
                            label="Currency Column"
                        >
                            {state.columns.common
                                .filter(({ type, nullable }) => type === "string" && !nullable)
                                .map(({ id, name }) => (
                                    <MenuItem key={id} value={id}>
                                        {name}
                                    </MenuItem>
                                ))}
                        </MappingColumnTextField>
                        <MappingColumnTextField
                            select={true}
                            value={state.mapping.currency.field}
                            onChange={onChangeCurrencyField}
                            size="small"
                            label="Matching Currency Field"
                        >
                            <MenuItem value="ticker">Ticker</MenuItem>
                            <MenuItem value="symbol">Symbol</MenuItem>
                            <MenuItem value="name">Name</MenuItem>
                        </MappingColumnTextField>
                    </>
                )}
            </DialogImportOptionsContainerBox>
            <DialogImportActionsBox>
                <Button color="error" variant="outlined" size="small" onClick={goBackToStatementParsing}>
                    Back
                </Button>
                <Tooltip title={canProgressToImportScreen || ""}>
                    <div>
                        <Button
                            variant="contained"
                            size="small"
                            disabled={canProgressToImportScreen !== null}
                            onClick={goToStatementImportScreen}
                        >
                            Filter Rows
                        </Button>
                    </div>
                </Tooltip>
            </DialogImportActionsBox>
        </StepContent>
    );
};

const getOnChangeMapping = (key: keyof typeof StatementMappingColumns) =>
    handleTextFieldChange((value: string) => changeStatementMappingValue(key, value || undefined));
const onChangeMappingDate = getOnChangeMapping("date");
const onChangeMappingReference = getOnChangeMapping("reference");
const onChangeMappingLongReference = getOnChangeMapping("longReference");
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

const MappingColumnTextField = styled(TextField)({ width: 220, marginTop: 10 });
const MappingColumnHeaderBox = styled("div")({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 15,
    width: 220,
});
const FlipValuesCheckboxSx = { margin: 0 };

const NullColumnMenuItem = (
    <MenuItem value="" sx={{ color: Greys[600], fontStyle: "italic" }}>
        None
    </MenuItem>
);
