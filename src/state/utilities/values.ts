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
export const BaseBalanceValues = () =>
    ({
        start: formatDate(getToday().startOf("month")),
        original: [],
        localised: [],
    } as BalanceHistory);

export interface TransactionHistory {
    start: SDate;
    credits: number[];
    debits: number[];
}
export const BaseTransactionHistory = () =>
    ({
        start: formatDate(getToday().startOf("month")),
        credits: [],
        debits: [],
    } as TransactionHistory);

/**
 * Dates
 */
/* eslint-disable no-redeclare */
export type ID = number;
export type SDate = string; // YYYY-MM-DD

export const getToday = () => DateTime.local();
export const getTodayString = () => formatDate(getToday());

export function formatJSDate(date: Date): string;
export function formatJSDate(date: Date | null): string | null;
export function formatJSDate(date: Date | undefined): string | undefined;
export function formatJSDate(date: Date | null | undefined): string | null | undefined;
export function formatJSDate(date: Date | null | undefined): string | null | undefined {
    return date && DateTime.fromJSDate(date as Date).toISODate();
}

export function parseJSDate(date: string): Date;
export function parseJSDate(date: string | null): Date | null;
export function parseJSDate(date: string | undefined): Date | undefined;
export function parseJSDate(date: string | null | undefined): Date | null | undefined;
export function parseJSDate(date: string | null | undefined): Date | null | undefined {
    return date == null ? (date as null | undefined) : new Date(date);
}

export function formatDate(date: DateTime): string;
export function formatDate(date: DateTime | null): string | null;
export function formatDate(date: DateTime | undefined): string | undefined;
export function formatDate(date: DateTime | null | undefined): string | null | undefined;
export function formatDate(date: DateTime | null | undefined): string | null | undefined {
    return date && date.toISODate();
}

export function parseDate(date: string): DateTime;
export function parseDate(date: string | null): DateTime | null;
export function parseDate(date: string | undefined): DateTime | undefined;
export function parseDate(date: string | null | undefined): DateTime | null | undefined;
export function parseDate(date: string | null | undefined): DateTime | null | undefined {
    return date == null ? (date as null | undefined) : DateTime.fromISO(date);
}
