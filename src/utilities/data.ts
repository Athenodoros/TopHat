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

export const createAndDownloadFile = (name: string, contents: string) => {
    const blob = new Blob([contents], { type: "text/plain" });

    const link = document.createElement("a");
    link.download = name;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
};
