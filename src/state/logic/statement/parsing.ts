import { EntityId } from "@reduxjs/toolkit";
import { countBy, get, inRange, mapValues, maxBy, range, toPairs, values, zip } from "lodash";
import { DateTime } from "luxon";
import Papa from "papaparse";
import { TopHatStore } from "../..";
import { zipObject } from "../../../utilities/data";
import { Account, changeCurrencyValue, Transaction } from "../../data";
import { formatDate, formatJSDate, ID, parseDate, SDate } from "../../utilities/values";
import {
    ColumnProperties,
    DateColumn,
    DialogColumnCurrencyColumnMapping,
    DialogColumnCurrencyConstantMapping,
    DialogColumnExclusionConfig,
    DialogColumnParseResult,
    DialogColumnTransferConfig,
    DialogColumnValueMapping,
    DialogParseSpecification,
    NumberColumn,
    StringColumn,
} from "./types";

const parseNumber = (rawValue: string) => {
    if (rawValue.match(/^[^.]*\.\d\d$/)) return +rawValue.replace(/,/g, "");
    if (rawValue.match(/^[^,]*,\d\d$/)) return +rawValue.replace(/\./g, "");
    return +rawValue;
};

const guessColumnProperties =
    (dateFormat: string | undefined) =>
    ({ id, name, raw }: { id: string; name: string; raw: string[] }): ColumnProperties => {
        const checkAll = (predicate: (x: string) => boolean) => raw.filter((x) => x).every(predicate);

        return {
            id,
            name,
            nullable: !raw.every(Boolean),
            raw: raw.map((x) => x || null),
            ...(checkAll((x) => !isNaN(parseNumber(x)))
                ? {
                      type: "number",
                      values: raw.map((x) => (x ? parseNumber(x) : null)),
                  }
                : dateFormat && checkAll((x) => Boolean(x) && DateTime.fromFormat(x, dateFormat).isValid)
                ? {
                      type: "date",
                      values: raw.map((x) => (x ? formatDate(DateTime.fromFormat(x, dateFormat)) : null)),
                  }
                : !dateFormat && checkAll((x) => Boolean(x) && !isNaN(new Date(x).getTime()))
                ? {
                      type: "date",
                      values: raw.map((x) => (x ? formatJSDate(new Date(x)) : null)),
                  }
                : {
                      type: "string",
                      values: raw.map((x) => x || null),
                  }),
        } as StringColumn<true> | NumberColumn<true> | DateColumn<true>;
    };

export const getFileColumnProperties = (
    contents: string,
    { delimiter, header, dateFormat }: DialogParseSpecification
): ColumnProperties[] | undefined => {
    const parsed = Papa.parse(contents, { delimiter, header, skipEmptyLines: "greedy" });
    if (parsed.errors.length) return undefined;

    const raw = parsed.meta.fields
        ? parsed.meta.fields.map((name, idx) => ({
              id: String(idx),
              name,
              raw: parsed.data.map((row) => (row as Record<string, string>)[name]),
          }))
        : (parsed.data as string[][])[0].map((_, idx) => ({
              id: String(idx),
              name: `Column ${idx + 1}`,
              raw: parsed.data.map((row) => (row as string[])[idx]),
          }));

    return raw.map(guessColumnProperties(dateFormat));
};

export const getCombinedColumnProperties = (
    files: { id: string; columns?: ColumnProperties[] }[],
    common?: DialogColumnParseResult<true>["common"]
): { columns: DialogColumnParseResult<true>; allMatch: boolean } => {
    // Ideally this might coerce types to supertypes (dates -> strings etc.) and similarly deal with nullability at some point
    if (common === undefined) {
        const counts = countBy(files, (file) =>
            JSON.stringify(file.columns?.map((column) => [column.id, column.name, column.type, column.nullable]))
        );
        const max = maxBy(toPairs(counts), ([_, count]) => count)![0];
        common =
            max !== "undefined" && counts[max] >= files.length / 2
                ? JSON.parse(max).map((column: any) => zipObject(["id", "name", "type", "nullable"], column))
                : undefined;
    }

    const matches = files.map(({ id, columns }) => {
        const matches =
            common !== undefined &&
            columns !== undefined &&
            zip(common, columns).every(
                ([reference, column]) =>
                    reference?.id === column?.id &&
                    reference?.name === column?.name &&
                    (reference?.type === "string" || reference?.type === column?.type) &&
                    (reference?.nullable || column?.nullable === false)
            );

        return { file: id, columns, matches };
    });

    return {
        columns: {
            common,
            all: zipObject(
                files.map(({ id }) => id),
                matches
            ),
        },
        allMatch: matches.every(({ matches }) => matches),
    };
};

export const guessStatementColumnMapping = (
    { all, common }: DialogColumnParseResult,
    defaultCurrency: ID
): DialogColumnValueMapping => {
    const mapping: DialogColumnValueMapping = {
        date: "",
        value: { type: "value", flip: false },
        currency: { type: "constant", currency: defaultCurrency },
    };

    const findColumn = (fieldType: ColumnProperties["type"], options: string[] = [""], nonnull: boolean = false) =>
        common.find(
            ({ id, name, type, nullable }) =>
                type === fieldType &&
                options.some((option) => name.toUpperCase().includes(option)) &&
                (!nonnull || nullable === false) &&
                !["date", "reference", "balance", "value.value", "value.credit", "value.debit", "currency.column"].some(
                    (path) => get(mapping, path) === id
                )
        )?.id;

    mapping.date = findColumn("date", ["DATE"], true) || findColumn("date", [""], true)!;
    mapping.balance = findColumn("number", ["BALANCE"]);

    // Ideally this section would check the values against any balance column
    if (findColumn("number", ["DEPOSIT", "CREDIT", "IN"]) && findColumn("number", ["WITHDRAWAL", "DEBIT", "OUT"])) {
        const debit = findColumn("number", ["WITHDRAWAL", "DEBIT", "OUT"]);

        const debits = values(all)
            .filter((file) => file.matches)
            .flatMap((file) => file.columns!.find(({ id }) => id === debit)!.values as (number | null)[]);
        const counts = countBy(debits, Math.sign);

        mapping.value = {
            type: "split",
            credit: findColumn("number", ["DEPOSIT", "CREDIT", "IN"]),
            debit: findColumn("number", ["WITHDRAWAL", "DEBIT", "OUT"]),
            flip: counts["1"] > counts["-1"],
        };
    } else {
        mapping.value = {
            type: "value",
            value: findColumn("number", ["VALUE", "AMOUNT"]) || findColumn("number"),
            flip: false,
        };
    }
    mapping.reference = findColumn("string", ["DESCRIPTION", "REFERENCE", "SUMMARY"]) || findColumn("string");
    mapping.currency = findColumn("string", ["CURRENCY"], true)
        ? {
              type: "column",
              column: findColumn("string", ["CURRENCY"], true)!,
              field: "ticker",
          }
        : {
              type: "constant",
              currency: defaultCurrency,
          };

    return mapping;
};

interface TransferCandidateSummary {
    file: string;

    value: number;
    currency: ID;
    reference?: string;

    transfer?: Transaction;
    excluded?: boolean;
}
export const guessStatementTransfers = (
    {
        columns,
        mapping,
    }: {
        columns: DialogColumnParseResult;
        mapping: DialogColumnValueMapping;
    },
    exclusions: DialogColumnExclusionConfig
): DialogColumnTransferConfig => {
    const currencyState = TopHatStore.getState().data.currency;
    const getCurrency = (id: EntityId) => currencyState.entities[id]!;

    // Lookup table to get currency IDs from tickers, names, or symbols
    let currencyFieldLookup: Record<string, ID> = {};
    if (mapping.currency.type === "column") {
        const options = currencyState.ids.map(getCurrency);
        currencyFieldLookup = zipObject(
            options.map((option) => option[(mapping.currency as DialogColumnCurrencyColumnMapping).field]),
            options.map(({ id }) => id)
        );
    }

    const dailyTransactions: Record<SDate, TransferCandidateSummary[]> = {};
    const results = mapValues(columns.all, (file) => {
        const getColumn = <T extends string | number | null>(id: string) =>
            file.columns!.find((column) => column.id === id)!.values as T[];
        const getMaybeColumn = <T extends number | string | null>(id?: string) =>
            id !== undefined ? getColumn<T>(id) : ([] as (T | undefined)[]);

        const dates = getColumn<string>(mapping.date);
        const values =
            mapping.value.type === "value"
                ? getMaybeColumn<number | null>(mapping.value.value)
                : zip(
                      getMaybeColumn<number | null>(mapping.value.credit),
                      getMaybeColumn<number | null>(mapping.value.debit)
                  ).map(([c, d]) => c ?? d);
        const currencies =
            mapping.currency.type === "constant"
                ? dates.map(() => (mapping.currency as DialogColumnCurrencyConstantMapping).currency)
                : getColumn<string>(mapping.currency.column).map((value) => currencyFieldLookup[value]);
        const references = getMaybeColumn<string | null>(mapping.reference);

        const candidates: Record<number, TransferCandidateSummary | undefined> = {};
        dates.forEach((date, idx) => {
            const value = values[idx];
            if (value !== null && value !== undefined) {
                const candidate: TransferCandidateSummary = {
                    file: file.file,
                    value,
                    currency: currencies[idx],
                    reference: references[idx] || undefined,
                    excluded: exclusions[file.file].includes(idx),
                };
                candidates[idx] = candidate;

                if (dailyTransactions[date] === undefined) dailyTransactions[date] = [];
                dailyTransactions[date].push(candidate);
            }
        });

        return { file: file.file, candidates };
    });

    // Loop through all transactions and update transfer candidates in place
    const { transaction: transactions } = TopHatStore.getState().data;

    const assignTransferCandidates = (
        test: (candidate: TransferCandidateSummary, transaction: Transaction) => boolean,
        days: number
    ) => {
        transactions.ids.forEach((id) => {
            const transaction = transactions.entities[id]!;
            if (!transaction.value) return;

            const date = parseDate(transaction.date);

            for (const i of range(days)) {
                for (const candidate of dailyTransactions[
                    formatDate(date.plus({ days: i * Math.sign(-transaction.value) }))
                ] || []) {
                    if (candidate.transfer === undefined && test(candidate, transaction)) {
                        candidate.transfer = transaction;
                        return;
                    }
                }
            }
        });
    };

    assignTransferCandidates(
        (c, t) => c.reference === t.reference && c.currency === t.currency && c.value === t.value,
        5
    );
    assignTransferCandidates(
        (c, t) =>
            c.reference === t.reference &&
            inRange(
                c.value / changeCurrencyValue(getCurrency(c.currency), getCurrency(t.currency), t.value!),
                0.8,
                1.2
            ),
        5
    );
    assignTransferCandidates((c, t) => c.currency === t.currency && c.value === t.value, 5);
    assignTransferCandidates(
        (c, t) =>
            inRange(
                c.value / changeCurrencyValue(getCurrency(c.currency), getCurrency(t.currency), t.value!),
                0.8,
                1.2
            ),
        5
    );

    return mapValues(results, ({ candidates }) =>
        mapValues(
            candidates,
            (candidate) => candidate && { transaction: candidate.transfer, excluded: candidate.excluded }
        )
    );
};

export const getStatementExclusions = ({
    account,
    columns: { all },
    mapping: { date },
}: {
    account?: Account;
    columns: DialogColumnParseResult;
    mapping: DialogColumnValueMapping;
}): DialogColumnExclusionConfig => {
    return mapValues(all, (file) => {
        const dates = file.columns!.find((column) => column.id === date)!.values as string[];

        return account?.lastStatementFormat
            ? (dates
                  .map((value, idx) => (value < account.lastStatementFormat!.date ? idx : null))
                  .filter((x) => x !== null) as number[])
            : [];
    });
};
