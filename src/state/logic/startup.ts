import { TopHatDispatch } from "..";
import { AppSlice } from "../app";
import { DataSlice } from "../data";

export const startup = () => {
    // Hydrate data store with appropriate data, and eventually run notification and data update logic
    // For now, just load test data
    TopHatDispatch(DataSlice.actions.setUpDemo());

    // Set up listener for forward/back browser buttons, correct initial path if necessary
    window.onpopstate = () => TopHatDispatch(AppSlice.actions.setPageStateFromPath());
};
