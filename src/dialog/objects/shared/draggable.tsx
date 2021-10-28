import styled from "@emotion/styled";
import { Menu } from "@mui/icons-material";
import { List, MenuItem } from "@mui/material";
import React from "react";
import {
    DragDropContext,
    Draggable,
    DraggableProvided,
    DraggableStateSnapshot,
    Droppable,
    DroppableProvided,
    DropResult,
} from "react-beautiful-dnd";
import { withSuppressEvent } from "../../../shared/events";
import { useDialogState } from "../../../state/app/hooks";
import { BasicObjectType } from "../../../state/data/types";
import { Greys } from "../../../styles/colours";
import { DialogOptions } from "../../shared/layout";
import {
    DialogObjectOptionsBox,
    DialogObjectSelectorProps,
    DialogSelectorAddNewButton,
    useObjectsWithExclusionList,
} from "./shared";
import { getUpdateFunctions } from "./update";
export { ObjectEditContainer } from "./edit";
export { getUpdateFunctions } from "./update";

export const DraggableDialogObjectSelector = <Name extends "rule">({
    type,
    exclude,
    createDefaultOption,
    onAddNew,
    render,
    onDragEnd,
}: DialogObjectSelectorProps<Name> & { onDragEnd: (result: DropResult) => void }) => {
    const selected = useDialogState(type, (object) => object?.id);
    const options = useObjectsWithExclusionList(type, exclude);
    const functions = getUpdateFunctions(type);

    const getMenuItem = (option: BasicObjectType[Name]) => (
        <Draggable draggableId={String(option.id)} index={option.index} key={option.id} isDragDisabled={false}>
            {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                <MenuItem
                    key={option.id}
                    selected={option.id === selected || snapshot.isDragging}
                    onClick={withSuppressEvent<HTMLLIElement>(() => functions.set(option))}
                    {...provided.draggableProps}
                    ref={provided.innerRef}
                >
                    {render(option)}
                    {provided && (
                        <HandleBox {...provided.dragHandleProps}>
                            <Menu fontSize="small" htmlColor={Greys[500]} />
                        </HandleBox>
                    )}
                </MenuItem>
            )}
        </Draggable>
    );

    const getList = (provided: DroppableProvided) => (
        <List {...provided.droppableProps} ref={provided.innerRef}>
            {options.map(getMenuItem)}
            {provided.placeholder}
        </List>
    );

    return (
        <DialogOptions>
            <DialogObjectOptionsBox>
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="object-list">{getList}</Droppable>
                </DragDropContext>
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
const HandleBox = styled("div")({ display: "flex", alignItems: "center", marginRight: 5 });
