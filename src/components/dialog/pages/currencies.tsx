import { IconButton, ListItemText, makeStyles, TextField, Tooltip } from "@material-ui/core";
import { Euro, Sync } from "@material-ui/icons";
import React, { useCallback } from "react";
import { TopHatStore } from "../../../state";
import { useDialogState } from "../../../state/app/hooks";
import { Currency } from "../../../state/data";
import { getNextID } from "../../../state/data/utilities";
import { BaseTransactionHistory, getRandomColour } from "../../../state/utilities/values";
import { handleTextFieldChange } from "../../../utilities/events";
import { useNumericInputHandler } from "../../../utilities/hooks";
import { getCurrencyIcon } from "../../display/ObjectDisplay";
import { DialogObjectEditWrapper, EditValueContainer, getUpdateFunctions, ObjectEditContainer } from "../utilities";

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
        <DialogObjectEditWrapper
            type="currency"
            createDefaultOption={createNewCurrency}
            render={render}
            placeholder={Placeholder}
        >
            <EditCurrencyView />
        </DialogObjectEditWrapper>
    );
};
const Placeholder = {
    icon: Euro,
    title: "Currencies",
    subtext:
        "Currencies are denominations for balances and transaction values: they could be fiat currencies, cryptocurrencies, or even assets like stocks or bonds.",
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
    const exchange = useNumericInputHandler(working.exchangeRate, updateWorkingExchangeRate);

    return (
        <ObjectEditContainer type="currency">
            <EditValueContainer label="Exchange Rate">
                <TextField
                    variant="outlined"
                    value={exchange.text}
                    onChange={exchange.onTextChange}
                    size="small"
                    style={{ width: 120 }}
                    placeholder="1.00"
                />
            </EditValueContainer>
            <EditValueContainer label="Display">
                <TextField
                    variant="outlined"
                    value={working.symbol || ""}
                    onChange={updateWorkingSymbol}
                    size="small"
                    style={{ width: 80, marginRight: 20 }}
                    label="Symbol"
                />
                <TextField
                    variant="outlined"
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

const { update } = getUpdateFunctions("currency");

const handleColorChange: React.ChangeEventHandler<HTMLInputElement> = (event) => update("colour")(event.target.value);
const generateRandomColour = () => update("colour")(getRandomColour());

const updateWorkingSymbol = handleTextFieldChange(update("symbol"));
const updateWorkingTicker = handleTextFieldChange(update("ticker"));
const updateWorkingExchangeRate = (value: number | null) => update("exchangeRate")(value || 1);