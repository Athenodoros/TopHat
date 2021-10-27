import styled from "@emotion/styled";
import { AddCircleOutline } from "@mui/icons-material";
import { Button } from "@mui/material";
import { Box } from "@mui/system";
import { upperFirst } from "lodash";
import React from "react";
import { withSuppressEvent } from "../../../shared/events";
import { useAllObjects } from "../../../state/data/hooks";
import { BasicObjectName, BasicObjectType } from "../../../state/data/types";
import { ID } from "../../../state/shared/values";
export { ObjectEditContainer } from "./edit";
export { getUpdateFunctions } from "./update";

export interface DialogObjectSelectorProps<Name extends BasicObjectName> {
    type: Name;
    exclude?: ID[];
    createDefaultOption?: () => BasicObjectType[Name];
    onAddNew?: () => void;
    render: (option: BasicObjectType[Name]) => React.ReactNode;
}

export const useObjectsWithExclusionList = <Name extends BasicObjectName>(type: Name, exclude?: ID[]) => {
    const options = useAllObjects(type);
    return exclude ? options.filter(({ id }) => !exclude.includes(id)) : options;
};

export const DialogObjectOptionsBox = styled(Box)({
    overflowY: "auto",
    flexGrow: 1,
    marginTop: 5,
});

export const DialogSelectorAddNewButton: React.FC<{ onClick: () => void; type: string }> = ({ onClick, type }) => (
    <DialogSelectorBottomButton
        variant="outlined"
        startIcon={<AddCircleOutline />}
        onClick={withSuppressEvent<HTMLButtonElement>(onClick)}
    >
        New {upperFirst(type)}
    </DialogSelectorBottomButton>
);
const DialogSelectorBottomButton = styled(Button)({ margin: 20 });
