import { range, zip, zipObject as zipObjectRaw } from "lodash-es";

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
