import chroma from "chroma-js";
import { DateTime } from "luxon";

/**
 * Colour Values
 */
export const ColourScale = chroma.scale("set1");
ColourScale.cache(false);
export const getRandomColour = () => ColourScale(Math.random()).hex();

/**
 * Value histories, monthly and in reverse order from current date
 */
export interface BalanceHistory {
    start: SDate;
    original: number[]; // Value in transaction currency
    localised: number[]; // Value in user's base currency
}
export const BaseBalanceValues = (): BalanceHistory => ({
    start: getCurrentMonthString(),
    original: [],
    localised: [],
});

export interface TransactionHistory {
    start: SDate;
    credits: number[];
    debits: number[];
    count: number;
}
export const BaseTransactionHistory = (): TransactionHistory => ({
    start: getCurrentMonthString(),
    credits: [],
    debits: [],
    count: 0,
});

export interface TransactionHistoryWithLocalisation extends TransactionHistory {
    localCredits: number[];
    localDebits: number[];
}
export const BaseTransactionHistoryWithLocalisation = (): TransactionHistoryWithLocalisation => ({
    ...BaseTransactionHistory(),
    localCredits: [],
    localDebits: [],
});

/**
 * Dates
 */
/* eslint-disable no-redeclare */
export type ID = number;
export type SDate = string & { __tag: "SDate" }; // YYYY-MM-DD
export type STime = string & { __tag: "STime" }; // ISO Timestamp

export const getNow = (): DateTime => DateTime.local();
export const getTodayString = (): SDate => formatDate(getNow());
export const getNowString = (): STime => formatDateTime(getNow());
export const getCurrentMonth = (): DateTime => getNow().startOf("month");
export const getCurrentMonthString = (): SDate => formatDate(getCurrentMonth());

export function formatJSDate(date: Date): SDate;
export function formatJSDate(date: Date | null): SDate | null;
export function formatJSDate(date: Date | undefined): SDate | undefined;
export function formatJSDate(date: Date | null | undefined): SDate | null | undefined;
export function formatJSDate(date: Date | null | undefined): SDate | null | undefined {
    return date && formatDate(DateTime.fromJSDate(date));
}

export function formatDate(date: DateTime): SDate;
export function formatDate(date: DateTime | null): SDate | null;
export function formatDate(date: DateTime | undefined): SDate | undefined;
export function formatDate(date: DateTime | null | undefined): SDate | null | undefined;
export function formatDate(date: DateTime | null | undefined): SDate | null | undefined {
    return date && (date.toISODate() as SDate);
}

export function formatDateTime(date: DateTime): STime;
export function formatDateTime(date: DateTime | null): STime | null;
export function formatDateTime(date: DateTime | undefined): STime | undefined;
export function formatDateTime(date: DateTime | null | undefined): STime | null | undefined;
export function formatDateTime(date: DateTime | null | undefined): STime | null | undefined {
    return date && (date.toISO() as STime);
}

export function parseDate(date: SDate | STime): DateTime;
export function parseDate(date: SDate | STime | null): DateTime | null;
export function parseDate(date: SDate | STime | undefined): DateTime | undefined;
export function parseDate(date: SDate | STime | null | undefined): DateTime | null | undefined;
export function parseDate(date: SDate | STime | null | undefined): DateTime | null | undefined {
    return date == null ? (date as null | undefined) : DateTime.fromISO(date);
}
