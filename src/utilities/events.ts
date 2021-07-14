import { SelectProps, TextFieldProps } from "@material-ui/core";
import React from "react";

export const suppressEvent = (event: React.MouseEvent | React.SyntheticEvent) => {
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
    <T>(onChange: (t: T) => void): SelectProps["onChange"] =>
    (event) =>
        onChange(event.target.value as T);

export const onTextFieldChange =
    (onChange: (value: string) => void): TextFieldProps["onChange"] =>
    (event) =>
        onChange(event.target.value);
