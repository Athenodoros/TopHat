import { min, toPairs } from "lodash";
import { DateTime } from "luxon";
import { TopHatDispatch, TopHatStore } from "..";
import { ID, SDate, formatDate, getCurrentMonth } from "../../state/shared/values";
import { DataSlice } from "../data";
import { CurrencyExchangeRate, CurrencySyncType, StubUserID } from "../data/types";
import { DailyCache } from "../shared/dailycache";
import { CURRENCY_NOTIFICATION_ID } from "./notifications/types";

const CACHE = new DailyCache<CurrencyExchangeRate[]>("CURRENCY_RATE_CACHE");

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

// Free AlphaVantage keys are limited to one request a second, so requests are spaced out rather
// than fired off in parallel: several synced currencies would otherwise rate limit each other.
const REQUEST_SPACING_MILLISECONDS = 1000;
let queue: Promise<unknown> = Promise.resolve();
// The response is raw JSON from the API, and is checked for the expected shape below
const queueAPIRequest = (query: string, token: string): Promise<Record<string, any>> => {
    const response = queue
        .then(() => fetch(`https://www.alphavantage.co/query?function=${query}&apikey=${token}`))
        .then((request) => request.json());

    const spacing = () => sleep(REQUEST_SPACING_MILLISECONDS);
    queue = response.then(spacing, spacing);

    return response;
};

// A rate limited request still comes back as a 200, with a body holding nothing but an explanation:
// under "Note" in older versions of the API and under "Information" since. Rather than match on
// that wording, which has changed before now, anything which is neither the requested data nor an
// explicit error is taken to be a rate limit and retried after a pause.
const RATE_LIMIT_RETRY_DELAYS = [1000, 2000, 4000];

const getFromAPI = async (
    query: string,
    token: string,
    key: string,
    retries: number[] = RATE_LIMIT_RETRY_DELAYS
): Promise<CurrencyExchangeRate[] | undefined> => {
    const response = await queueAPIRequest(query, token);
    const data = response[key];

    if (data === undefined) {
        // The daily quota also arrives as a rate limit, so retries are capped and the caller is
        // eventually told the sync has failed
        if (response["Error Message"] !== undefined || retries.length === 0) return undefined;

        await sleep(retries[0]);
        return getFromAPI(query, token, key, retries.slice(1));
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
    if (type === "currency" && ticker === "USD") return [{ month: "1970-01-01" as SDate, value: 1 }];
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
