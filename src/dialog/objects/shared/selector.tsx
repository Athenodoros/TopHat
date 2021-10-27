import { MenuItem, MenuList } from "@mui/material";
import React from "react";
import { withSuppressEvent } from "../../../shared/events";
import { useDialogState } from "../../../state/app/hooks";
import { BasicObjectName } from "../../../state/data/types";
import { DialogOptions } from "../../shared/layout";
import {
    DialogObjectOptionsBox,
    DialogObjectSelectorProps,
    DialogSelectorAddNewButton,
    useObjectsWithExclusionList,
} from "./shared";
import { getUpdateFunctions } from "./update";

export const BasicDialogObjectSelector = <Name extends BasicObjectName>({
    type,
    exclude,
    createDefaultOption,
    onAddNew,
    render,
}: DialogObjectSelectorProps<Name>) => {
    const selected = useDialogState(type, (object) => object?.id);
    const options = useObjectsWithExclusionList(type, exclude);
    const functions = getUpdateFunctions(type);

    return (
        <DialogOptions>
            <DialogObjectOptionsBox>
                <MenuList>
                    {options.map((option) => (
                        <MenuItem
                            key={option.id}
                            selected={option.id === selected}
                            onClick={withSuppressEvent<HTMLLIElement>(() => functions.set(option))}
                        >
                            {render(option)}
                        </MenuItem>
                    ))}
                </MenuList>
            </DialogObjectOptionsBox>
            {(createDefaultOption || onAddNew) && (
                <DialogSelectorAddNewButton
                    onClick={() => (onAddNew ? onAddNew() : functions.set(createDefaultOption!()))}
                    type={type}
                />
            )}
        </DialogOptions>
    );
};
