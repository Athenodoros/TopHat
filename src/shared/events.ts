import { CheckboxProps, SelectProps, TextFieldProps } from "@mui/material";
import { ToggleButtonGroupProps } from "@mui/lab";
import React from "react";

export const stopEventPropagation = (event: React.MouseEvent | React.SyntheticEvent) => event.stopPropagation();
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

export const handleButtonGroupChange =
    <T>(onChange: (t: T) => void): ToggleButtonGroupProps["onChange"] =>
    (event, value) =>
        onChange(value as T);

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

export const handleAutoCompleteChange =
    <T>(onChange: (value: T[]) => void) =>
    (_: any, value: T[]) =>
        onChange(value);
