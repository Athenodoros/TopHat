/** @vitest-environment jsdom */

import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { formatDate, getCurrentMonth } from "../shared/values";
import { getCurrencyRates } from "./currencies";

const MONTH = getCurrentMonth();

const RATES = { "Time Series FX (Monthly)": { [formatDate(MONTH)]: { "4. close": "0.72130" } } };
const PARSED_RATES = [{ month: formatDate(MONTH), value: 0.72 }];
const RATE_LIMITED = {
    Information:
        "Thank you for using Alpha Vantage! Please consider spreading out your free API requests more sparingly " +
        "(1 request per second). You may subscribe to any of the premium plans at " +
        "https://www.alphavantage.co/premium/ to lift the free key rate limit (25 requests per day), raise the " +
        "per-second burst limit, and instantly unlock all premium endpoints",
};

const respondWith = (...bodies: object[]) => {
    const fetchMock = vi.fn(async () => ({
        json: async () => bodies[Math.min(fetchMock.mock.calls.length - 1, bodies.length - 1)],
    }));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
};

// Each test uses its own ticker, since successful pulls are cached in localStorage for the day
let counter = 0;
const uniqueTicker = () => `TICKER${counter++}`;

beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
});
afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

test("Rate limited requests are retried rather than reported as failures", async () => {
    const fetchMock = respondWith(RATE_LIMITED, RATES);

    const rates = getCurrencyRates("currency", uniqueTicker(), "token");
    await vi.advanceTimersByTimeAsync(10 * 1000);

    expect(await rates).toEqual(PARSED_RATES);
    expect(fetchMock).toHaveBeenCalledTimes(2);
});

test("Persistent rate limiting eventually fails, rather than retrying forever", async () => {
    const fetchMock = respondWith(RATE_LIMITED);

    const rates = getCurrencyRates("currency", uniqueTicker(), "token");
    await vi.advanceTimersByTimeAsync(60 * 1000);

    expect(await rates).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(4);
});

test("Requests are spaced out, so that they do not rate limit each other", async () => {
    const fetchMock = respondWith(RATES);

    const rates = [uniqueTicker(), uniqueTicker(), uniqueTicker()].map((ticker) =>
        getCurrencyRates("currency", ticker, "token")
    );

    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(10 * 1000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(await Promise.all(rates)).toEqual(rates.map(() => PARSED_RATES));
});

test("Rejected requests are not retried", async () => {
    const fetchMock = respondWith({ "Error Message": "the parameter apikey is invalid or missing." });

    const rates = getCurrencyRates("currency", uniqueTicker(), "token");
    await vi.advanceTimersByTimeAsync(60 * 1000);

    expect(await rates).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
});
