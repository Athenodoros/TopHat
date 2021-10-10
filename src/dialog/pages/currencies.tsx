import { AddCircleOutline, Clear, Euro, Sync } from "@mui/icons-material";
import { DatePickerProps } from "@mui/lab";
import { IconButton, ListItemText, TextField, Tooltip } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { Box } from "@mui/system";
import { cloneDeep, sortBy } from "lodash";
import { DateTime } from "luxon";
import React, { useCallback } from "react";
import { NonIdealState } from "../../components/display/NonIdealState";
import { getCurrencyIcon } from "../../components/display/ObjectDisplay";
import { AutoClosingDatePicker } from "../../components/inputs";
import { handleTextFieldChange } from "../../shared/events";
import { useNumericInputHandler } from "../../shared/hooks";
import { TopHatDispatch, TopHatStore } from "../../state";
import { AppSlice } from "../../state/app";
import { useDialogHasWorking, useDialogState } from "../../state/app/hooks";
import { Currency } from "../../state/data";
import { getNextID } from "../../state/data/shared";
import { CurrencyExchangeRate } from "../../state/data/types";
import {
    BaseTransactionHistoryWithLocalisation,
    formatDate,
    getRandomColour,
    getTodayString,
} from "../../state/shared/values";
import {
    BasicDialogObjectSelector,
    DialogContents,
    DialogMain,
    EditTitleContainer,
    EditValueContainer,
    getUpdateFunctions,
    ObjectEditContainer,
} from "../shared";

const useMainStyles = makeStyles({
    base: {
        display: "flex",
        alignItems: "center",
        height: 32,
    },
    icon: {
        height: 24,
        width: 24,
        marginRight: 15,
        borderRadius: 5,
    },
});

export const DialogCurrenciesView: React.FC = () => {
    const classes = useMainStyles();
    const working = useDialogHasWorking();
    const render = useCallback(
        (currency: Currency) => (
            <div className={classes.base}>
                {getCurrencyIcon(currency, classes.icon)}
                <ListItemText>{currency.name}</ListItemText>
            </div>
        ),
        [classes]
    );

    return (
        <DialogMain onClick={remove}>
            <BasicDialogObjectSelector type="currency" createDefaultOption={createNewCurrency} render={render} />
            <DialogContents>
                {working ? (
                    <EditCurrencyView />
                ) : (
                    <NonIdealState
                        icon={Euro}
                        title="Currencies"
                        subtitle="Currencies are denominations for balances and transaction values: they could be fiat currencies, cryptocurrencies, or even assets like stocks or bonds."
                    />
                )}
            </DialogContents>
        </DialogMain>
    );
};

const createNewCurrency = (): Currency => ({
    id: getNextID(TopHatStore.getState().data.currency.ids),
    ticker: "NCD",
    colour: getRandomColour(),
    name: "New Currency",
    symbol: "$",
    rates: [{ date: getTodayString(), value: 1 }],
    transactions: BaseTransactionHistoryWithLocalisation(),
});

const useEditViewStyles = makeStyles({
    colourContainer: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",

        "& input": { width: 40, height: 40 },
    },
});
const EditCurrencyView: React.FC = () => {
    const classes = useEditViewStyles();
    const working = useDialogState("currency")!;

    return (
        <ObjectEditContainer type="currency">
            <EditValueContainer label="Display">
                <TextField
                    value={working.symbol || ""}
                    onChange={updateWorkingSymbol}
                    size="small"
                    sx={{ width: 80 }}
                    label="Symbol"
                />
                <TextField
                    value={working.ticker || ""}
                    onChange={updateWorkingTicker}
                    size="small"
                    sx={{ width: 120, margin: "0 20px" }}
                    label="Ticker"
                />
                <div className={classes.colourContainer}>
                    <input type="color" value={working.colour} onChange={handleColorChange} />
                    <IconButton size="small" onClick={generateRandomColour}>
                        <Tooltip title="Get random colour">
                            <Sync />
                        </Tooltip>
                    </IconButton>
                </div>
            </EditValueContainer>
            <EditTitleContainer title="Exchange Rates" />
            {working.rates.map((rate, idx) => (
                <EditableRateDisplay rate={rate} index={idx} key={idx} id={working.id} />
            ))}
            <EditValueContainer>
                <IconButton size="small" onClick={addNewRate}>
                    <AddCircleOutline fontSize="small" color="primary" />
                </IconButton>
            </EditValueContainer>
        </ObjectEditContainer>
    );
};

const addNewRate = () =>
    updateWithEdit((working) => {
        working.rates.unshift({ date: getTodayString(), value: working.rates[0].value });
    });
const updateWithEdit = (edit: (currency: Currency) => void) => {
    const currency = cloneDeep(TopHatStore.getState().app.dialog.currency!);
    edit(currency);
    currency.rates = sortBy(currency.rates, (rate) => -new Date(rate.date));
    TopHatDispatch(AppSlice.actions.setDialogPartial({ currency }));
};
const EditableRateDisplay: React.FC<{ rate: CurrencyExchangeRate; index: number; id?: any }> = ({
    rate,
    index,
    id,
}) => {
    const updateValue = useCallback(
        (value: number | null) =>
            updateWithEdit((working) => {
                working.rates[index].value = value || 0;
            }),
        [index]
    );
    const updateDate = useCallback(
        (date: DateTime) =>
            updateWithEdit((working) => {
                working.rates[index].date = formatDate(date);
            }),
        [index]
    );
    const remove = useCallback(
        () =>
            updateWithEdit((working) => {
                working.rates = working.rates.filter((_, idx) => idx !== index);
            }),
        [index]
    );

    const value = useNumericInputHandler(rate.value, updateValue, `${index} - ${id}`);

    return (
        <EditValueContainer
            label={
                <IconButton size="small" onClick={remove}>
                    <Clear fontSize="small" color="error" />
                </IconButton>
            }
        >
            <Box sx={{ display: "flex" }}>
                <TextField
                    value={value.text}
                    onChange={value.onTextChange}
                    size="small"
                    sx={{ width: 100, marginRight: 20 / 8 }}
                    label="Value"
                />
                <AutoClosingDatePicker
                    value={rate.date}
                    onChange={updateDate as DatePickerProps["onChange"]}
                    inputFormat="yyyy-MM-dd"
                    renderInput={(params) => <TextField {...params} sx={{ width: 160 }} size="small" label="Date" />}
                />
            </Box>
        </EditValueContainer>
    );
};

const { update, remove } = getUpdateFunctions("currency");

const handleColorChange: React.ChangeEventHandler<HTMLInputElement> = (event) => update("colour")(event.target.value);
const generateRandomColour = () => update("colour")(getRandomColour());

const updateWorkingSymbol = handleTextFieldChange(update("symbol"));
const updateWorkingTicker = handleTextFieldChange(update("ticker"));
