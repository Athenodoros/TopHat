export const filterListByID = (list: number[], value: number | undefined) => filterListByIDs(list, [value as number]);
export const filterListByIDs = (list: number[], values: number[]) =>
    list.length === 0 || values.some((value) => list.includes(value));
