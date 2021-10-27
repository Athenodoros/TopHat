import { cloneDeep } from "lodash";
import { TopHatDispatch, TopHatStore } from "../../../state";
import { AppSlice } from "../../../state/app";
import { DataSlice } from "../../../state/data";
import { BasicObjectName, BasicObjectType } from "../../../state/data/types";
import { ID } from "../../../state/shared/values";

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
