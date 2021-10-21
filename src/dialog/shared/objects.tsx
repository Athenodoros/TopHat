import { AddCircleOutline, DeleteForeverTwoTone, DeleteTwoTone, Menu, SaveTwoTone } from "@mui/icons-material";
import { Button, List, MenuItem, MenuList, TextField, Tooltip } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { cloneDeep, isEqual, upperFirst } from "lodash";
import React, { useCallback, useMemo, useState } from "react";
import {
    DragDropContext,
    Draggable,
    DraggableProvided,
    DraggableStateSnapshot,
    Droppable,
    DroppableProvided,
    DropResult,
} from "react-beautiful-dnd";
import { handleTextFieldChange, withSuppressEvent } from "../../shared/events";
import { TopHatDispatch, TopHatStore } from "../../state";
import { AppSlice } from "../../state/app";
import { useDialogState } from "../../state/app/hooks";
import { DataSlice, useDeleteObjectError } from "../../state/data";
import { useAllObjects, useObjectByID } from "../../state/data/hooks";
import { BasicObjectName, BasicObjectType } from "../../state/data/types";
import { ID } from "../../state/shared/values";
import { Greys } from "../../styles/colours";
import { EditDivider } from "./edits";
import { DialogOptions } from "./layout";

export const useDialogObjectSelectorStyles = makeStyles({
    options: {
        overflowY: "auto",
        flexGrow: 1,
        marginTop: 5,
    },
    button: {
        margin: 20,
    },
    handle: {
        display: "flex",
        alignItems: "center",
        marginRight: 5,
    },
});

interface DialogObjectSelectorProps<Name extends BasicObjectName> {
    type: Name;
    exclude?: ID[];
    createDefaultOption?: () => BasicObjectType[Name];
    onAddNew?: () => void;
    render: (option: BasicObjectType[Name]) => React.ReactNode;
}
const useFilteredObjects = <Name extends BasicObjectName>(type: Name, exclude?: ID[]) => {
    const options = useAllObjects(type);
    return exclude ? options.filter(({ id }) => !exclude.includes(id)) : options;
};
export const DialogSelectorAddNewButton: React.FC<{ onClick: () => void; type: string }> = ({ onClick, type }) => (
    <Button
        className={useDialogObjectSelectorStyles().button}
        variant="outlined"
        startIcon={<AddCircleOutline />}
        onClick={withSuppressEvent<HTMLButtonElement>(onClick)}
    >
        New {upperFirst(type)}
    </Button>
);

export const BasicDialogObjectSelector = <Name extends BasicObjectName>({
    type,
    exclude,
    createDefaultOption,
    onAddNew,
    render,
}: DialogObjectSelectorProps<Name>) => {
    const classes = useDialogObjectSelectorStyles();
    const selected = useDialogState(type, (object) => object?.id);
    const options = useFilteredObjects(type, exclude);
    const functions = getUpdateFunctions(type);

    return (
        <DialogOptions>
            <div className={classes.options}>
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
            </div>
            {(createDefaultOption || onAddNew) && (
                <DialogSelectorAddNewButton
                    onClick={() => (onAddNew ? onAddNew() : functions.set(createDefaultOption!()))}
                    type={type}
                />
            )}
        </DialogOptions>
    );
};

export const HeaderDialogObjectSelector = <Name extends BasicObjectName>({
    type,
    exclude,
    createDefaultOption,
    onAddNew,
    render,
}: DialogObjectSelectorProps<Name>) => {
    const classes = useDialogObjectSelectorStyles();
    const selected = useDialogState(type, (object) => object?.id);
    const options = useFilteredObjects(type, exclude);
    const functions = getUpdateFunctions(type);

    return (
        <DialogOptions>
            <div className={classes.options}>
                <List>
                    {options.map((option) => (
                        <MenuItem
                            key={option.id}
                            selected={option.id === selected}
                            onClick={withSuppressEvent<HTMLLIElement>(() => functions.set(option))}
                        >
                            {render(option)}
                        </MenuItem>
                    ))}
                </List>
            </div>
            {(createDefaultOption || onAddNew) && (
                <DialogSelectorAddNewButton
                    onClick={() => (onAddNew ? onAddNew() : functions.set(createDefaultOption!()))}
                    type={type}
                />
            )}
        </DialogOptions>
    );
};

export const DraggableDialogObjectSelector = <Name extends "rule">({
    type,
    exclude,
    createDefaultOption,
    onAddNew,
    render,
    onDragEnd,
}: DialogObjectSelectorProps<Name> & { onDragEnd: (result: DropResult) => void }) => {
    const classes = useDialogObjectSelectorStyles();
    const selected = useDialogState(type, (object) => object?.id);
    const options = useFilteredObjects(type, exclude);
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
                        <div {...provided.dragHandleProps} className={classes.handle}>
                            <Menu fontSize="small" htmlColor={Greys[500]} />
                        </div>
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
            <div className={classes.options}>
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="object-list">{getList}</Droppable>
                </DragDropContext>
            </div>
            {(createDefaultOption || onAddNew) && (
                <DialogSelectorAddNewButton
                    onClick={() => (onAddNew ? onAddNew() : functions.set(createDefaultOption!()))}
                    type={type}
                />
            )}
        </DialogOptions>
    );
};

const useObjectContainerStyles = makeStyles({
    edit: {
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        minHeight: 0,
        padding: "20px 20px 8px 20px",
        flexGrow: 1,
    },
    editContainer: {
        flexShrink: 1,
        flexGrow: 1,
        overflowY: "auto",
        paddingRight: 30,
    },
    actions: {
        marginTop: "auto",
        display: "flex",
        alignSelf: "flex-end",
        paddingTop: 8,
        "& > *": { marginLeft: 10 },
    },
    subtitleStub: { height: 15 },
});
export const ObjectEditContainer = <Type extends BasicObjectName>({
    type,
    children,
    subtitle,
    onReset,
    valid,
}: React.PropsWithChildren<{ type: Type; subtitle?: React.ReactNode; onReset?: () => void; valid?: boolean }>) => {
    const classes = useObjectContainerStyles();

    const working = useDialogState(type) as BasicObjectType[Type];
    const actual = useObjectByID(type, working.id);

    const {
        handleNameChange,
        reset,
        destroy,
        save: saveRaw,
    } = useMemo(() => {
        const functions = getUpdateFunctions(type);
        return {
            handleNameChange: handleTextFieldChange(functions.update("name")),
            reset: () => {
                const actual = functions.get(working.id);
                functions.set(actual);
                if (actual && onReset) onReset();
            },
            destroy: () => functions.destroy(working.id),
            save: functions.save,
        };
    }, [type, working.id, onReset]);
    const save = useCallback(() => saveRaw(working), [saveRaw, working]);

    const deleteObjectError = useDeleteObjectError(type, working.id);
    const [deleteEnabled, setDeleteEnabled] = useState(false);
    const enableDelete = useCallback(() => setDeleteEnabled(true), []);

    return (
        <div className={classes.edit}>
            <TextField label={`${upperFirst(type)} Name`} value={working.name} onChange={handleNameChange} />
            {subtitle || <div className={classes.subtitleStub} />}
            <EditDivider />
            <div className={classes.editContainer}>{children}</div>
            <div className={classes.actions}>
                <Button
                    color="warning"
                    disabled={isEqual(working, actual)}
                    startIcon={<DeleteTwoTone fontSize="small" />}
                    onClick={reset}
                >
                    Reset
                </Button>
                <Tooltip title={deleteObjectError || ""}>
                    <span>
                        <Button
                            color="error"
                            disabled={deleteObjectError !== undefined}
                            startIcon={<DeleteForeverTwoTone fontSize="small" />}
                            onClick={deleteEnabled ? destroy : enableDelete}
                            variant={deleteEnabled ? "contained" : undefined}
                        >
                            {deleteEnabled ? "Confirm" : "Delete"}
                        </Button>
                    </span>
                </Tooltip>
                <Button
                    disabled={isEqual(working, actual) || valid === false}
                    variant="outlined"
                    startIcon={<SaveTwoTone fontSize="small" />}
                    onClick={save}
                >
                    Save
                </Button>
            </div>
        </div>
    );
};

export const getUpdateFunctions = <Type extends BasicObjectName>(type: Type) => {
    type Option = BasicObjectType[Type];

    const get = (id: ID) => TopHatStore.getState().data[type].entities[Number(id)] as Option;
    const getWorkingCopy = () => cloneDeep(TopHatStore.getState().app.dialog[type] as Option);
    const set = (option?: Option) => TopHatDispatch(AppSlice.actions.setDialogPartial({ id: type, [type]: option }));
    const setPartial = (partial?: Partial<Option>) =>
        set({ ...(TopHatStore.getState().app.dialog[type]! as Option), ...partial });
    const remove = () => set();
    const update =
        <K extends keyof Option>(key: K) =>
        (value: Option[K]) =>
            setPartial({ [key]: value } as any);

    // Delete is a JS keyword
    const destroy = (id: ID) => {
        remove();
        TopHatDispatch(DataSlice.actions.deleteObject({ type, id }));
    };

    const save = (working: Option) => {
        TopHatDispatch(DataSlice.actions.saveObject({ type, working }));
        // Sometimes calculated properties can change in saveObject - this updates the working state
        TopHatDispatch(AppSlice.actions.setDialogPartial({ [type]: get(working.id) }));
    };

    return { get, getWorkingCopy, set, setPartial, remove, update, destroy, save };
};
