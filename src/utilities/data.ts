import { zip } from "lodash-es";

export const equalZip = <S, T>(s: S[], t: T[]) => zip(s, t) as [S, T][];

export const flipListIncludes = <T>(id: T, list: T[]) =>
    list.includes(id) ? list.filter((x) => x !== id) : list.concat([id]);

export const formatEmpty = () => "";
