import { TopHatDispatch } from "..";
import { DataSlice } from "../data";

export const startup = () => {
    TopHatDispatch(DataSlice.actions.setUpDemo());
};
