import { SelectProps } from "@material-ui/core";
import React from "react";

export const suppressEvent = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
};
export const withSuppressEvent =
    <T extends Element>(callback: (event: React.MouseEvent<T>) => void) =>
    (event: React.MouseEvent<T>) => {
        suppressEvent(event);
        callback(event);
    };

export const onSelectChange =
    <T>(onChange: (t: T) => void) =>
    (event: Parameters<NonNullable<SelectProps["onChange"]>>[0]) =>
        onChange(event.target.value as T);
