import { min, toPairs } from "lodash";
import { DateTime } from "luxon";
import { TopHatDispatch, TopHatStore } from "..";
import { ID, SDate, formatDate, getCurrentMonth } from "../../state/shared/values";
import { DataSlice } from "../data";
import { CurrencyExchangeRate, CurrencySyncType, StubUserID } from "../data/types";
import { DailyCache } from "../shared/dailycache";
import { CURRENCY_NOTIFICATION_ID } from "./notifications/types";

const CACHE = new DailyCache<CurrencyExchangeRate[]>("CURRENCY_RATE_CACHE");

const getFromAPI = async (query: string, token: string, key: string): Promise<CurrencyExchangeRate[] | undefined> => {
    const request = await fetch(`https://www.alphavantage.co/query?function=${query}&apikey=${token}`);
    const response = await request.json();
    const data = response[key];

    if (data === undefined) {
        if ((response?.Note as string | undefined)?.endsWith("target a higher API call frequency.")) {
            // Standard AlphaVantage rate limit is 5 per second - this retries in case of bottlenecks
            return new Promise((resolve) => setTimeout(() => resolve(getFromAPI(query, token, key)), 60 * 1000));
        }
        return undefined;
    }

    const history = toPairs(data).map(([month, values]) => [month, Number((values as any)["4. close"])]) as [
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
};

const requestCurrencyRates = async (type: CurrencySyncType["type"], ticker: string, token: string) => {
    if (ticker === "") return;
    if (type === "currency" && ticker === "USD") return [{ month: "1970-01-01", value: 1 }];
    if (type === "currency")
        return getFromAPI(`FX_MONTHLY&from_symbol=${ticker}&to_symbol=USD`, token, "Time Series FX (Monthly)");
    if (type === "crypto")
        return getFromAPI(
            `DIGITAL_CURRENCY_MONTHLY&symbol=${ticker}&market=USD`,
            token,
            "Time Series (Digital Currency Monthly)"
        );
    if (type === "stock")
        return getFromAPI(`TIME_SERIES_MONTHLY_ADJUSTED&symbol=${ticker}`, token, "Monthly Adjusted Time Series");

    return undefined;
};

export const getCurrencyRates = async (
    type: CurrencySyncType["type"],
    ticker: string,
    token: string,
    start?: SDate
) => {
    let values = CACHE.get(`${type}-${ticker}`);
    if (values === undefined) {
        values = await requestCurrencyRates(type, ticker, token);
        if (values) {
            CACHE.set(`${type}-${ticker}`, values);
        }
    }

    const startWithMinimum = min([start, formatDate(getCurrentMonth().minus({ months: 24 }))])!;
    return values?.filter(({ month }) => month >= startWithMinimum);
};

export const updateSyncedCurrencies = () => {
    if (!window.navigator.onLine) return;

    const {
        currency: { ids, entities },
        user,
    } = TopHatStore.getState().data;
    const token = user.entities[StubUserID]!.alphavantage;

    return Promise.all(
        (ids as ID[])
            .filter((id) => entities[id]?.sync)
            .map((id) => entities[id]!)
            .map(async (currency) => {
                const rates = await getCurrencyRates(currency.sync!.type, currency.sync!.ticker, token, currency.start);
                return rates && { id: currency.id, rates };
            })
    )
        .then((results) => {
            if (results.every((result) => result))
                TopHatDispatch(DataSlice.actions.updateCurrencyRates(results as NonNullable<(typeof results)[0]>[]));
            else setSyncError();
        })
        .catch(setSyncError);
};

const setSyncError = () =>
    TopHatDispatch(
        DataSlice.actions.updateNotificationState({
            id: CURRENCY_NOTIFICATION_ID,
            contents: "",
        })
    );
