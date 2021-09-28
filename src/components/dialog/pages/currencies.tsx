import { Euro, Sync } from "@mui/icons-material";
import { IconButton, ListItemText, TextField, Tooltip } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import React, { useCallback } from "react";
import { TopHatStore } from "../../../state";
import { useDialogHasWorking, useDialogState } from "../../../state/app/hooks";
import { Currency } from "../../../state/data";
import { getNextID } from "../../../state/data/utilities";
import { BaseTransactionHistory, getRandomColour } from "../../../state/utilities/values";
import { handleTextFieldChange } from "../../../utilities/events";
import { useNumericInputHandler } from "../../../utilities/hooks";
import { NonIdealState } from "../../display/NonIdealState";
import { getCurrencyIcon } from "../../display/ObjectDisplay";
import {
    BasicDialogObjectSelector,
    DialogContents,
    DialogMain,
    EditValueContainer,
    getUpdateFunctions,
    ObjectEditContainer,
} from "../utilities";

const useMainStyles = makeStyles({
    base: {
        display: "flex",
        alignItems: "center",
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
    exchangeRate: 1,
    transactions: BaseTransactionHistory(),
});

const useEditViewStyles = makeStyles({
    colourContainer: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: 90,

        "& input": { width: 50, height: 50 },
    },
});
const EditCurrencyView: React.FC = () => {
    const classes = useEditViewStyles();
    const working = useDialogState("currency")!;
    const exchange = useNumericInputHandler(working.exchangeRate, updateWorkingExchangeRate, working.id);

    // The dummy is to help ESLint work out the dependencies of the callback
    const setExchangeValue = exchange.setValue;
    const onReset = useCallback(() => {
        const actual = TopHatStore.getState().data.currency.entities[working.id];
        if (actual) {
            setExchangeValue(actual.exchangeRate);
        }
    }, [setExchangeValue, working.id]);

    return (
        <ObjectEditContainer type="currency" onReset={onReset}>
            <EditValueContainer label="Exchange Rate">
                <TextField
                    value={exchange.text}
                    onChange={exchange.onTextChange}
                    size="small"
                    style={{ width: 120 }}
                    placeholder="1.00"
                />
            </EditValueContainer>
            <EditValueContainer label="Display">
                <TextField
                    value={working.symbol || ""}
                    onChange={updateWorkingSymbol}
                    size="small"
                    style={{ width: 80, marginRight: 20 }}
                    label="Symbol"
                />
                <TextField
                    value={working.ticker || ""}
                    onChange={updateWorkingTicker}
                    size="small"
                    style={{ width: 120 }}
                    label="Ticker"
                />
            </EditValueContainer>
            <EditValueContainer label="Colour">
                <div className={classes.colourContainer}>
                    <input type="color" value={working.colour} onChange={handleColorChange} />
                    <IconButton size="small" onClick={generateRandomColour}>
                        <Tooltip title="Get random colour">
                            <Sync />
                        </Tooltip>
                    </IconButton>
                </div>
            </EditValueContainer>
        </ObjectEditContainer>
    );
};

const { update, remove } = getUpdateFunctions("currency");

const handleColorChange: React.ChangeEventHandler<HTMLInputElement> = (event) => update("colour")(event.target.value);
const generateRandomColour = () => update("colour")(getRandomColour());

const updateWorkingSymbol = handleTextFieldChange(update("symbol"));
const updateWorkingTicker = handleTextFieldChange(update("ticker"));
const updateWorkingExchangeRate = (value: number | null) => update("exchangeRate")(value || 1);
