import { Button, List, makeStyles, MenuItem, TextField } from "@material-ui/core";
import { AddCircleOutline, DeleteForeverTwoTone, DeleteTwoTone, Menu, SaveTwoTone } from "@material-ui/icons";
import { isEqual, upperFirst } from "lodash";
import React, { useMemo } from "react";
import {
    DragDropContext,
    Draggable,
    DraggableProvided,
    DraggableStateSnapshot,
    Droppable,
    DroppableProvided,
    DropResult,
} from "react-beautiful-dnd";
import { TopHatDispatch, TopHatStore } from "../../../state";
import { AppSlice } from "../../../state/app";
import { useDialogState } from "../../../state/app/hooks";
import { useAllObjects, useObjectByID } from "../../../state/data/hooks";
import { BasicObjectName, BasicObjectType } from "../../../state/data/types";
import { ID } from "../../../state/utilities/values";
import { Greys } from "../../../styles/colours";
import { useButtonStyles } from "../../../styles/components";
import { handleTextFieldChange, withSuppressEvent } from "../../../utilities/events";
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
        color="primary"
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
                <List>
                    {options.map((option) => (
                        <MenuItem
                            key={option.id}
                            selected={option.id === selected}
                            onClick={withSuppressEvent(() =>
                                functions.set(option.id === selected ? undefined : option)
                            )}
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
                            onClick={withSuppressEvent(() =>
                                functions.set(option.id === selected ? undefined : option)
                            )}
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
                    onClick={withSuppressEvent(() => functions.set(option.id === selected ? undefined : option))}
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
        "& > *": { marginLeft: 10 },
    },
    subtitleStub: { height: 15 },
});
export const ObjectEditContainer = <Type extends BasicObjectName>({
    type,
    children,
    subtitle,
    onReset,
}: React.PropsWithChildren<{ type: Type; subtitle?: React.ReactNode; onReset?: () => void }>) => {
    const classes = useObjectContainerStyles();
    const buttonClasses = useButtonStyles();

    const working = useDialogState(type) as BasicObjectType[Type];
    const actual = useObjectByID(type, working.id);

    const { handleNameChange, reset } = useMemo(() => {
        const functions = getUpdateFunctions(type);
        return {
            handleNameChange: handleTextFieldChange(functions.update("name")),
            reset: () => {
                const actual = functions.get(working.id);
                functions.set(actual);
                if (actual && onReset) onReset();
            },
        };
    }, [type, working.id, onReset]);

    return (
        <div className={classes.edit}>
            <TextField
                variant="outlined"
                label={`${upperFirst(type)} Name`}
                value={working.name}
                onChange={handleNameChange}
            />
            {subtitle || <div className={classes.subtitleStub} />}
            <EditDivider />
            <div className={classes.editContainer}>{children}</div>
            <div className={classes.actions}>
                <Button
                    className={buttonClasses.warning}
                    disabled={isEqual(working, actual)}
                    startIcon={<DeleteTwoTone fontSize="small" />}
                    onClick={reset}
                >
                    Reset
                </Button>
                <Button
                    className={buttonClasses.danger}
                    disabled={!actual}
                    startIcon={<DeleteForeverTwoTone fontSize="small" />}
                >
                    Delete
                </Button>
                <Button
                    className={buttonClasses.primaryOutlined}
                    disabled={isEqual(working, actual)}
                    variant="outlined"
                    startIcon={<SaveTwoTone fontSize="small" />}
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
    const set = (option?: Option) => TopHatDispatch(AppSlice.actions.setDialogPartial({ [type]: option }));
    const setPartial = (partial?: Partial<Option>) =>
        set({ ...(TopHatStore.getState().app.dialog[type]! as Option), ...partial });
    const remove = () => set();
    const update =
        <K extends keyof Option>(key: K) =>
        (value: Option[K]) =>
            setPartial({ [key]: value } as any);

    return { get, set, setPartial, remove, update };
};
