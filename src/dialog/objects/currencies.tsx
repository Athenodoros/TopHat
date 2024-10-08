import styled from "@emotion/styled";
import {
    Cached,
    Cancel,
    CheckCircle,
    Clear,
    Euro,
    EuroSymbol,
    KeyboardArrowDown,
    Money,
    ShowChart,
    Sync,
} from "@mui/icons-material";
import {
    Button,
    CircularProgress,
    IconButton,
    Link,
    ListItemText,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from "@mui/material";
import { Box } from "@mui/system";
import { debounce, last, orderBy, range } from "lodash";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { NonIdealState } from "../../components/display/NonIdealState";
import { getCurrencyIcon } from "../../components/display/ObjectDisplay";
import { ObjectSelector } from "../../components/inputs";
import { formatNumber } from "../../shared/data";
import { handleButtonGroupChange, handleTextFieldChange } from "../../shared/events";
import { TopHatDispatch, TopHatStore } from "../../state";
import { AppSlice } from "../../state/app";
import { useDialogHasWorking, useDialogState } from "../../state/app/hooks";
import { Currency, DataSlice } from "../../state/data";
import { useAllCurrencies, useDefaultCurrency, useUserData } from "../../state/data/hooks";
import { DEMO_ALPHAVANTAGE_TOKEN, getNextID } from "../../state/data/shared";
import { CurrencySyncType } from "../../state/data/types";
import { getCurrencyRates } from "../../state/logic/currencies";
import {
    BaseTransactionHistoryWithLocalisation,
    ID,
    formatDate,
    getCurrentMonth,
    getCurrentMonthString,
    getRandomColour,
    getTodayString,
} from "../../state/shared/values";
import { Greys, Intents } from "../../styles/colours";
import { DialogContents, DialogMain, EditTitleContainer, EditValueContainer } from "../shared";
import { useTimeSeriesInput } from "../shared/TimeSeriesInput";
import { BasicDialogObjectSelector, ObjectEditContainer, getUpdateFunctions } from "./shared";

export const DialogCurrenciesView: React.FC = () => {
    const working = useDialogHasWorking();

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
                        action={<DefaultCurrencySelector />}
                    />
                )}
            </DialogContents>
        </DialogMain>
    );
};

const updateDefaultCurrency = (id: ID) => TopHatDispatch(DataSlice.actions.setDefaultCurrency(id));
const DefaultCurrencySelector: React.FC = () => {
    const currencies = useAllCurrencies();
    const current = useDefaultCurrency();

    return (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 50 }}>
            <Typography variant="subtitle2">Default Currency</Typography>
            <ObjectSelector
                options={currencies}
                render={(currency) => getCurrencyIcon(currency, CurrencyIconSx)}
                selected={current.id}
                setSelected={updateDefaultCurrency}
            >
                <Button
                    variant="outlined"
                    color="primary"
                    sx={{
                        color: Greys[700],
                        textTransform: "inherit",
                        height: 40,

                        "& > svg": { marginLeft: 10 },
                    }}
                >
                    {getCurrencyIcon(current, CurrencyIconSx)}
                    <Typography variant="body1" noWrap={true}>
                        {current.name}
                    </Typography>
                    <KeyboardArrowDown fontSize="small" htmlColor={Greys[600]} />
                </Button>
            </ObjectSelector>
        </Box>
    );
};

const CurrencyBox = styled("div")({
    display: "flex",
    alignItems: "center",
    height: 32,
    flexGrow: 1,
});
const CurrencyIconSx = {
    height: 24,
    width: 24,
    marginRight: 15,
    borderRadius: "5px",
};
const render = (currency: Currency) => (
    <CurrencyBox>
        {getCurrencyIcon(currency, CurrencyIconSx)}
        <ListItemText>{currency.name}</ListItemText>
        {currency.sync && (
            <Tooltip title="Automatic Exchange Rates">
                <Cached htmlColor={Greys[500]} fontSize="small" />
            </Tooltip>
        )}
    </CurrencyBox>
);

const createNewCurrency = (): Currency => ({
    id: getNextID(TopHatStore.getState().data.currency.ids),
    ticker: "NCD",
    colour: getRandomColour(),
    name: "New Currency",
    symbol: "$",
    start: getCurrentMonthString(),
    rates: [{ month: getTodayString(), value: 1 }],
    transactions: BaseTransactionHistoryWithLocalisation(),
});

const EditCurrencyView: React.FC = () => {
    const working = useDialogState("currency")!;

    const [ticker, setTicker] = useState(working.sync?.ticker || "");
    const [syncStatus, setSyncStatus] = useState<"fail" | "loading" | "success">("fail");
    useEffect(() => {
        setTicker(working.sync?.ticker || "");
        setSyncStatus(working.sync ? "success" : "fail");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [working.id]);

    const alphavantage = useUserData((user) => user.alphavantage);
    const isDemoError = alphavantage === DEMO_ALPHAVANTAGE_TOKEN && ticker !== "" && ticker !== "EUR";

    const updateSyncDebounced = useMemo(
        () =>
            debounce(async (strategy: CurrencySyncType["type"], ticker: string) => {
                const values = await getCurrencyRates(strategy, ticker, alphavantage, working.start);
                if (values === undefined) setSyncStatus("fail");
                else {
                    update("rates")(values);
                    setSyncStatus("success");
                }
            }, 500),
        [alphavantage, working.start]
    );
    const updateSyncType = useMemo(
        () =>
            handleButtonGroupChange(async (strategy: CurrencySyncType["type"] | "none") => {
                if (!strategy) return;

                if (strategy === "none") update("sync")(undefined);
                else {
                    setSyncStatus("loading");
                    update("sync")({ type: strategy, ticker });
                    updateSyncDebounced(strategy, ticker);
                }
            }),
        [updateSyncDebounced, ticker]
    );
    const pullForwardConstValue = useCallback(() => void null, []);

    const handleTickerChange = useMemo(
        () =>
            handleTextFieldChange(async (value) => {
                setSyncStatus("loading");
                setTicker(value);
                update("sync")({ type: working.sync!.type, ticker: value });
                updateSyncDebounced(working.sync!.type, value);
            }),
        [updateSyncDebounced, working.sync]
    );

    const timeSeriesInput = useCurrencyRatesInput(
        working,
        working.sync?.type && (
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <TextField
                    value={ticker}
                    onChange={handleTickerChange}
                    size="small"
                    placeholder={TickerPlaceholders[working.sync?.type || "currency"]}
                    disabled={working.sync === undefined}
                    key={working.id + "-" + working.sync?.type}
                    error={isDemoError}
                    label={
                        isDemoError ? (
                            <>
                                No Currency Token - See{" "}
                                <Link
                                    onClick={goToTokenSetup}
                                    underline="hover"
                                    sx={{ pointerEvents: "all", cursor: "pointer" }}
                                >
                                    Here
                                </Link>
                            </>
                        ) : (
                            TickerDescriptions[working.sync?.type || "currency"]
                        )
                    }
                />
                {syncStatus === "fail" ? (
                    <Cancel htmlColor={Intents.danger.light} />
                ) : syncStatus === "success" ? (
                    <CheckCircle htmlColor={Intents.success.light} />
                ) : (
                    <CircularProgress />
                )}
            </Box>
        )
    );

    return (
        <ObjectEditContainer
            type="currency"
            onReset={timeSeriesInput.onReset}
            valid={syncStatus === "success" || working.sync === undefined}
        >
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
                <ColourContainerBox>
                    <input type="color" value={working.colour} onChange={handleColorChange} />
                    <IconButton size="small" onClick={generateRandomColour}>
                        <Tooltip title="Get random colour">
                            <Sync />
                        </Tooltip>
                    </IconButton>
                </ColourContainerBox>
            </EditValueContainer>
            <EditTitleContainer title="Exchange Rates" />
            <EditValueContainer label="Source">
                <ToggleButtonGroup
                    size="small"
                    value={working.sync?.type || "none"}
                    exclusive={true}
                    onChange={updateSyncType}
                    sx={{
                        flexGrow: 1,
                        "& > button": {
                            flexGrow: 1,
                            padding: 5,
                        },
                    }}
                >
                    <ToggleButton
                        value="none"
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            width: 60,
                        }}
                    >
                        <Tooltip title="Manual Rates">
                            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                <Clear fontSize="small" />
                                <Typography variant="caption">None</Typography>
                            </Box>
                        </Tooltip>
                    </ToggleButton>
                    <ToggleButton
                        value="currency"
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            width: 60,
                        }}
                    >
                        <Tooltip title="Pin to Currency">
                            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                <EuroSymbol fontSize="small" />
                                <Typography variant="caption">Currency</Typography>
                            </Box>
                        </Tooltip>
                    </ToggleButton>
                    <ToggleButton
                        value="crypto"
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            width: 60,
                        }}
                    >
                        <Tooltip title="Pin to Crypto">
                            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                <Money fontSize="small" />
                                <Typography variant="caption">Crypto</Typography>
                            </Box>
                        </Tooltip>
                    </ToggleButton>
                    <ToggleButton
                        value="stock"
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            width: 60,
                        }}
                    >
                        <Tooltip title="Pin to Stock">
                            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                <ShowChart fontSize="small" />
                                <Typography variant="caption">Stock</Typography>
                            </Box>
                        </Tooltip>
                    </ToggleButton>
                </ToggleButtonGroup>
            </EditValueContainer>
            <EditValueContainer label="Data">{timeSeriesInput.component}</EditValueContainer>
        </ObjectEditContainer>
    );
};

const TickerDescriptions = {
    currency: "Symbol",
    crypto: "Symbol",
    stock: "Ticker",
};
const TickerPlaceholders = {
    currency: "USD",
    crypto: "BTC",
    stock: "AAPL",
};

const { update, remove, getWorkingCopy: getWorking } = getUpdateFunctions("currency");

const handleColorChange: React.ChangeEventHandler<HTMLInputElement> = (event) => update("colour")(event.target.value);
const generateRandomColour = () => update("colour")(getRandomColour());

const updateWorkingSymbol = handleTextFieldChange(update("symbol"));
const updateWorkingTicker = handleTextFieldChange(update("ticker"));

const getTimeSeriesFromRates = (rates: Currency["rates"]) => {
    return range(24).map((months) => {
        const month = formatDate(getCurrentMonth().minus({ months }));
        return (rates.find((rate) => rate.month <= month) || last(rates))?.value || 0;
    });
};

const getCurrencyMouseOverText = (value: number) => "US$ " + formatNumber(value, { minDecimals: 2 });
const useCurrencyRatesInput = (working: Currency, inputs?: React.ReactNode) => {
    const getOriginalRates = useCallback(() => {
        const actual = TopHatStore.getState().data.currency.entities[working.id];
        return actual && getTimeSeriesFromRates(actual.rates);
    }, [working.id]);

    const rates = getTimeSeriesFromRates(working.rates);

    return useTimeSeriesInput({
        values: rates,
        getOriginals: getOriginalRates,
        update: updateMonthsRate,
        id: working.id,
        inputs,
        pullForward: pullForwardRate,
        getMouseOverText: getCurrencyMouseOverText,
    });
};

const pullForwardRate = () => {
    let { rates } = getWorking();
    update("rates")([{ month: getCurrentMonthString(), value: rates[0].value }]);
};

const updateMonthsRate = (index: number, value: number | null) => {
    const month = formatDate(getCurrentMonth().minus({ months: index }));
    let { rates } = getWorking();

    const number = rates.findIndex((rate) => rate.month === month);
    if (number !== -1) {
        if (value !== null) {
            rates[number].value = value;
        } else {
            rates.splice(number, 1);
        }
    } else if (value !== null) {
        rates.push({ month, value });
        rates = orderBy(rates, "month", "desc");
    }

    update("rates")(rates);
};

const ColourContainerBox = styled("div")({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",

    "& input": { width: 40, height: 40 },
});

const goToTokenSetup = () =>
    TopHatDispatch(AppSlice.actions.setDialogPartial({ currency: undefined, settings: "currency", id: "settings" }));
