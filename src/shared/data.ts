import { fromPairs, range, reverse, toPairs, zip, zipObject as zipObjectRaw } from "lodash-es";

export const equalZip = <S, T>(s: S[], t: T[]) => zip(s, t) as [S, T][];

export const flipListIncludes = <T>(id: T, list: T[]) =>
    list.includes(id) ? list.filter((x) => x !== id) : list.concat([id]);

export const formatEmpty = () => "";

export const updateListSelection = <T>(t: T, ts: T[]) => (ts.includes(t) ? ts.filter((x) => x !== t) : ts.concat([t]));

export const takeWithDefault = <T>(array: T[], length: number, fallback: T) =>
    range(length).map((i) => array[i] ?? fallback);

export const takeWithFilter = <T>(array: T[], count: number, filter: (t: T) => boolean) => {
    let values = [];

    for (let value of array) {
        if (filter(value)) {
            values.push(value);
            if (values.length === count) break;
        }
    }

    return values;
};

export const zipObject = <K extends string | number, V>(keys: readonly K[], values: readonly V[]) =>
    zipObjectRaw(keys, values) as Record<K, V>;

export const createAndDownloadFile = (name: string, contents: string | Blob) => {
    const blob = new Blob([contents], { type: "text/plain" });

    const link = document.createElement("a");
    link.download = name;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
};

export interface ChartDomainFunctions {
    getPoint: (raw: number) => string;
    getOffsetAndSizeForRange: (x: number, y?: number) => { offset: string; size: string };
}
export const getChartDomainFunctions = (values: number[], padding: number = 0): ChartDomainFunctions => {
    const flip = values.every((x) => x <= 0) ? -1 : 1;
    values = values.map((x) => x * flip);

    let min = Math.min(0, ...values);
    let max = Math.max(0, ...values);

    if (min === 0 && max === 0) {
        max = 0.1;
    }

    const valueRange = max - min;
    min -= min ? valueRange * padding : 0;
    max += valueRange * padding;

    const scale = (raw: number) => (raw / (max - min)) * 100 + "%";

    const getPoint = (raw: number) => scale(raw * flip - min);
    const getOffsetAndSizeForRange = (x: number, y: number = 0) => ({
        offset: scale(Math.min(x * flip, y * flip) - min),
        size: scale(Math.abs(x - y)),
    });

    return { getPoint, getOffsetAndSizeForRange };
};

export const mapValuesWithKeys = <K extends string | number, V, O>(object: Record<K, V>, fn: (k: K, v: V) => O) =>
    fromPairs(toPairs(object).map(([k, v]) => [k, fn(k as K, v as V)])) as Record<K, O>;

/**
 * This is a small utility to format numbers, to save downloading the full numeral.js package
 * This doesn't deal with locales, but neither would the simple numeral(...).format(...) that it replaced
 */
export interface NumberFormatConfig {
    separator?: string | null;
    start?: "+" | "-" | null;
    end?: "k" | "%" | null;
    decimals?: number;
}
export const formatNumber = (value: number, config?: NumberFormatConfig) => {
    const { separator = ",", start = "-", end = null, decimals = 2 } = config || {};

    const sign = value < 0 ? (start !== null ? "-" : "") : start === "+" ? "+" : "";
    value = Math.abs(value || 0);

    let final = "";
    if (end === "k") {
        const size = (
            [
                [9, "b"],
                [6, "m"],
                [3, "k"],
            ] as const
        ).find(([magnitude, _]) => value >= Math.pow(10, magnitude));

        if (size) {
            value /= Math.pow(10, size[0]);
            final = size[1];
        }
    } else if (end === "%") {
        value *= 100;
        final = "%";
    }

    const integer = "" + (decimals ? Math.floor(value) : Math.round(value));
    const integerDisplay =
        reverse(range(integer.length, 0, -3))
            .map((i) => integer.substring(i - 3, i))
            .join(separator || "")
            .replace(/^0*/, "") || "0";

    const decimal = "" + Math.round((value - Math.floor(value)) * Math.pow(10, decimals)) / Math.pow(10, decimals);
    const decimalDisplay = decimals
        ? "." + (decimal.split(".")[1] || "").concat("0".repeat(decimals)).substring(0, decimals)
        : "";

    return sign + integerDisplay + decimalDisplay + final;
};
