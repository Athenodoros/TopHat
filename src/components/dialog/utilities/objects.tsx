import { Button, List, makeStyles, MenuItem, TextField } from "@material-ui/core";
import { AddCircleOutline, DeleteForeverTwoTone, DeleteTwoTone, SaveTwoTone } from "@material-ui/icons";
import { isEqual, upperFirst } from "lodash";
import React, { useMemo } from "react";
import { TopHatDispatch, TopHatStore } from "../../../state";
import { AppSlice } from "../../../state/app";
import { useDialogState } from "../../../state/app/hooks";
import { useObjectByID } from "../../../state/data/hooks";
import { BasicObjectName, BasicObjectType } from "../../../state/data/types";
import { ID } from "../../../state/utilities/values";
import { useButtonStyles } from "../../../styles/components";
import { handleTextFieldChange, withSuppressEvent } from "../../../utilities/events";
import { EditDivider } from "./edits";
import { DialogOptions } from "./layout";

const useStyles = makeStyles({
    options: {
        overflow: "scroll",
        flexGrow: 1,
        marginTop: 5,
    },
    button: {
        margin: 20,
    },
});

interface DialogObjectSelectorProps<Name extends BasicObjectName> {
    type: Name;
    options: BasicObjectType[Name][];
    createDefaultOption: () => BasicObjectType[Name];
    render: (option: BasicObjectType[Name]) => React.ReactNode;
}
export const DialogObjectSelector = <Name extends BasicObjectName>({
    type,
    options,
    createDefaultOption,
    render,
}: DialogObjectSelectorProps<Name>) => {
    const classes = useStyles();
    const selected = useDialogState(type, (object) => object?.id);

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
            <Button
                className={classes.button}
                variant="outlined"
                color="primary"
                startIcon={<AddCircleOutline />}
                onClick={withSuppressEvent<HTMLButtonElement>(() => functions.set(createDefaultOption()))}
            >
                New {upperFirst(type)}
            </Button>
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
        overflowY: "scroll",
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
}: React.PropsWithChildren<{ type: Type; subtitle?: React.ReactNode }>) => {
    const classes = useObjectContainerStyles();
    const buttonClasses = useButtonStyles();

    const working = useDialogState(type) as BasicObjectType[Type];
    const actual = useObjectByID(type, working.id);

    const { handleNameChange, reset } = useMemo(() => {
        const functions = getUpdateFunctions(type);
        return {
            handleNameChange: handleTextFieldChange(functions.update("name")),
            reset: () => functions.set(functions.get(working.id)),
        };
    }, [type, working.id]);

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
