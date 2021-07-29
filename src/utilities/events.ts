import { CheckboxProps, SelectProps, TextFieldProps } from "@material-ui/core";
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

export const handleSelectChange =
    <T>(onChange: (t: T) => void): SelectProps["onChange"] =>
    (event) =>
        onChange(event.target.value as T);

export const handleTextFieldChange =
    (onChange: (value: string) => void): TextFieldProps["onChange"] =>
    (event) =>
        onChange(event.target.value);

export const handleCheckboxChange =
    (onChange: (value: boolean) => void): CheckboxProps["onChange"] =>
    (_, value) =>
        onChange(value);
