import { SelectProps } from "@material-ui/core";

export const onSelectChange =
    <T,>(onChange: (t: T) => void) =>
    (event: Parameters<NonNullable<SelectProps["onChange"]>>[0]) =>
        onChange(event.target.value as T);
