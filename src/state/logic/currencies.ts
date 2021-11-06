import { get, min, toPairs } from "lodash";
import { DateTime } from "luxon";
import { TopHatDispatch, TopHatStore } from "..";
import { formatDate, getCurrentMonth, SDate } from "../../state/shared/values";
import { DataSlice } from "../data";
import { CurrencyExchangeRate, CurrencySyncType, StubUserID } from "../data/types";
import { conditionallyUpdateNotificationState } from "./notifications/shared";
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

const getFromAPI = async (
    query: string,
    token: string,
    key: string,
    value: string
): Promise<CurrencyExchangeRate[] | undefined> => {
    const request = await fetch(`${AlphaVantage}${query}&apikey=${token}`);
    const response = await request.json();
    const data = response[key];

    if (data === undefined) {
        if ((response?.Note as string | undefined)?.endsWith("target a higher API call frequency.")) {
            // Standard AlphaVantage rate limit is 5 per second - this retries in case of bottlenecks
            return new Promise((resolve) => setTimeout(() => resolve(getFromAPI(query, token, key, value)), 60 * 1000));
        }
        return undefined;
    }

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
};

let cancel: (() => void) | undefined = undefined;
export const getCurrencyRates = async (
    type: CurrencySyncType["type"],
    ticker: string,
    token: string,
    start?: SDate,
    bulk?: boolean
) => {
    let cancelled = false;
    if (!bulk) {
        if (cancel) cancel();

        cancel = () => {
            cancelled = true;
        };
    }

    if (ticker === "") return;

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

    return Promise.all(
        ids
            .filter((id) => entities[id]?.sync)
            .map(async (id) => {
                const currency = entities[id]!;
                return getCurrencyRates(currency.sync!.type, currency.sync!.ticker, token, currency.start, true).then(
                    (rates) => {
                        if (rates) {
                            TopHatDispatch(
                                DataSlice.actions.saveObject({
                                    type: "currency",
                                    working: { ...currency, rates },
                                    automated: true,
                                })
                            );
                        }
                        return !!rates;
                    }
                );
            })
    )
        .then((results) =>
            conditionallyUpdateNotificationState(
                CURRENCY_NOTIFICATION_ID,
                results.some((result) => result === false) ? "" : null
            )
        )
        .catch(() => conditionallyUpdateNotificationState(CURRENCY_NOTIFICATION_ID, ""));
};
