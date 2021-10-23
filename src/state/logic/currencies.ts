import axios from "axios";
import { get, min, toPairs } from "lodash";
import { DateTime } from "luxon";
import { TopHatDispatch, TopHatStore } from "..";
import { formatDate, getCurrentMonth, SDate } from "../../state/shared/values";
import { DataSlice } from "../data";
import { CurrencyExchangeRate, CurrencySyncType, StubUserID } from "../data/types";
import { CURRENCY_NOTIFICATION_ID } from "./notifications/variants/currency";

const AlphaVantage = "https://www.alphavantage.co/query?function=";
const CurrencyRateRules = {
    currency: (ticker: string, token: string) =>
        getFromAPI(`FX_MONTHLY&from_symbol=${ticker}&to_symbol=USD`, token, "Time Series FX (Monthly)", "4. close"),
    crypto: (ticker: string, token: string) =>
        getFromAPI(
            `DIGITAL_CURRENCY_MONTHLY&symbol=${ticker}&market=USD`,
            token,
            "Time Series (Digital Currency Monthly)",
            "4a. close (USD)"
        ),
    stock: (ticker: string, token: string) =>
        getFromAPI(`TIME_SERIES_MONTHLY_ADJUSTED&symbol=${ticker}`, token, "Monthly Adjusted Time Series", "4. close"),
};

const getFromAPI = (query: string, token: string, key: string, value: string) =>
    axios.get(AlphaVantage + query + `&apikey=${token}`).then((req) => {
        const data = (req.data as any)[key];
        if (data === undefined) return undefined;

        const history = toPairs(data).map(([month, values]) => [month, Number((values as any)[value])]) as [
            string,
            number
        ][];

        return history.map(
            ([month, value]) =>
                ({
                    month: formatDate(DateTime.fromISO(month).startOf("month")),
                    value: Math.round(value * 100) / 100,
                } as CurrencyExchangeRate)
        );
    });

let cancel: (() => void) | undefined = undefined;
export const getCurrencyRates = async (
    type: CurrencySyncType["type"],
    ticker: string,
    token: string,
    start?: SDate
) => {
    if (cancel) cancel();

    let cancelled = false;
    cancel = () => {
        cancelled = true;
    };

    let results = await get(
        CurrencyRateRules,
        type,
        () => new Promise((resolve) => resolve([])) as Promise<CurrencyExchangeRate[]>
    )(ticker, token);

    start = min([start, formatDate(getCurrentMonth().minus({ months: 24 }))])!;
    if (results) results = results.filter(({ month }) => month >= start!);

    if (!cancelled) return results;
};

export const updateSyncedCurrencies = () => {
    if (!window.navigator.onLine) return;

    const {
        currency: { ids, entities },
        user,
    } = TopHatStore.getState().data;
    const token = user.entities[StubUserID]!.alphavantage;

    Promise.all(
        ids.map(async (id) => {
            const currency = entities[id]!;
            if (currency.sync) {
                return getCurrencyRates(currency.sync.type, currency.sync.ticker, token, currency.start).then(
                    (rates) => {
                        if (rates) {
                            TopHatDispatch(
                                DataSlice.actions.saveObject({
                                    type: "currency",
                                    working: { ...currency, rates },
                                })
                            );
                        }
                    }
                );
            }
        })
    )
        .then(() =>
            TopHatDispatch(
                DataSlice.actions.updateNotificationState({
                    user: {},
                    id: CURRENCY_NOTIFICATION_ID,
                    contents: null,
                })
            )
        )
        .catch(() =>
            TopHatDispatch(
                DataSlice.actions.updateNotificationState({
                    user: {},
                    id: CURRENCY_NOTIFICATION_ID,
                    contents: "",
                })
            )
        );
};