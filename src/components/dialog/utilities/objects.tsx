import { Button, List, makeStyles, MenuItem, TextField } from "@material-ui/core";
import { AddCircleOutline, DeleteForeverTwoTone, DeleteTwoTone, Menu, SaveTwoTone } from "@material-ui/icons";
import { inRange, isEqual, upperFirst } from "lodash";
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
import { DataSlice } from "../../../state/data";
import { useAllObjects, useObjectByID } from "../../../state/data/hooks";
import { BasicObjectName, BasicObjectType } from "../../../state/data/types";
import { ID } from "../../../state/utilities/values";
import { Greys } from "../../../styles/colours";
import { useButtonStyles } from "../../../styles/components";
import { handleTextFieldChange, withSuppressEvent } from "../../../utilities/events";
import { EditDivider } from "./edits";
import {
    DialogContents,
    DialogMain,
    DialogOptions,
    DialogPlaceholderDisplay,
    DialogPlaceholderDisplayProps,
} from "./layout";

const useStyles = makeStyles({
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

interface DialogObjectSelectorProps<
    Name extends BasicObjectName,
    Drag extends BasicObjectType[Name] extends { index: number } ? boolean : false
> {
    type: Name;
    exclude?: ID[];
    createDefaultOption?: () => BasicObjectType[Name];
    onAddNew?: () => void;
    render: (option: BasicObjectType[Name]) => React.ReactNode;
    draggable?: Drag;
}
export const DialogObjectSelector = <
    Name extends BasicObjectName,
    Drag extends BasicObjectType[Name] extends { index: number } ? boolean : false
>({
    type,
    exclude,
    createDefaultOption,
    onAddNew,
    render,
    draggable,
}: DialogObjectSelectorProps<Name, Drag>) => {
    const classes = useStyles();
    const selected = useDialogState(type, (object) => object?.id);

    let options = useAllObjects(type);
    if (exclude) options = options.filter(({ id }) => !exclude.includes(id));

    const functions = getUpdateFunctions(type);

    const getItem =
        (option: BasicObjectType[Name]) => (provided?: DraggableProvided, snapshot?: DraggableStateSnapshot) =>
            (
                <MenuItem
                    key={option.id}
                    selected={option.id === selected || snapshot?.isDragging}
                    onClick={withSuppressEvent(() => functions.set(option.id === selected ? undefined : option))}
                    {...provided?.draggableProps}
                    ref={provided?.innerRef}
                >
                    {render(option)}
                    {provided && (
                        <div {...provided.dragHandleProps} className={classes.handle}>
                            <Menu fontSize="small" htmlColor={Greys[500]} />
                        </div>
                    )}
                </MenuItem>
            );
    const getList = (provided?: DroppableProvided) => (
        <List {...provided?.droppableProps} ref={provided?.innerRef}>
            {options.map((option) =>
                draggable ? (
                    <Draggable
                        draggableId={String(option.id)}
                        index={(option as { index: number }).index}
                        key={option.id}
                        isDragDisabled={false}
                    >
                        {getItem(option)}
                    </Draggable>
                ) : (
                    getItem(option)()
                )
            )}
            {provided?.placeholder}
        </List>
    );

    return (
        <DialogOptions>
            <div className={classes.options}>
                {draggable ? (
                    <DragDropContext onDragEnd={onDragEndForRule}>
                        <Droppable droppableId="object-list">{getList}</Droppable>
                    </DragDropContext>
                ) : (
                    getList()
                )}
            </div>
            {(createDefaultOption || onAddNew) && (
                <Button
                    className={classes.button}
                    variant="outlined"
                    color="primary"
                    startIcon={<AddCircleOutline />}
                    onClick={withSuppressEvent<HTMLButtonElement>(() =>
                        onAddNew ? onAddNew() : functions.set(createDefaultOption!())
                    )}
                >
                    New {upperFirst(type)}
                </Button>
            )}
        </DialogOptions>
    );
};

const onDragEndForRule = ({ source, destination, reason, draggableId }: DropResult) => {
    if (reason !== "DROP" || destination === undefined) return;

    const { ids, entities } = TopHatStore.getState().data.rule;

    const rangeMin = Math.min(source.index, destination.index);
    const rangeMax = Math.max(source.index, destination.index);
    const updates = ids
        .filter((id) => inRange(entities[id]!.index, rangeMin, rangeMax + 1) && entities[id]!.index !== source.index)
        .map((id) => ({
            id,
            changes: {
                index: entities[id]!.index + (source.index > destination.index ? 1 : -1),
            },
        }))
        .concat([{ id: Number(draggableId), changes: { index: destination.index } }]);

    TopHatDispatch(DataSlice.actions.updateObjects({ type: "rule", updates }));
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

export const DialogObjectEditWrapper = <
    Name extends BasicObjectName,
    Drag extends BasicObjectType[Name] extends { index: number } ? boolean : false
>({
    type,
    placeholder,
    children,
    ...SelectorProps
}: React.PropsWithChildren<DialogObjectSelectorProps<Name, Drag> & { placeholder: DialogPlaceholderDisplayProps }>) => {
    const working = useDialogState(type, (working) => !!working);
    const remove = useMemo(() => getUpdateFunctions(type).remove, [type]);

    return (
        <DialogMain onClick={remove}>
            <DialogObjectSelector type={type} {...SelectorProps} />
            <DialogContents>{working ? children : <DialogPlaceholderDisplay {...placeholder} />}</DialogContents>
        </DialogMain>
    );
};
