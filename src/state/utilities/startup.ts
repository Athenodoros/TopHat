import { store, TopHatDispatch } from "..";
import { AppSlice, DefaultPages, getPagePathForPageState, getPageStateFromPagePath } from "../app";
import { DataSlice } from "../data";

export const startup = () => {
    // Hydrate data store with appropriate data - always test data for now
    TopHatDispatch(DataSlice.actions.setUpDemo());

    // Set up listener for forward/back browser buttons, correct initial path if necessary
    const manageStateFromPath = () => {
        if (window.location.pathname !== getPagePathForPageState(store.getState().app.page)) {
            let state = getPageStateFromPagePath(window.location.pathname);

            if (state === null) {
                state = DefaultPages["summary"];
                window.history.pushState(null, "", getPagePathForPageState(state));
            }

            TopHatDispatch(AppSlice.actions.setPageState(state));
        }
    };

    window.onpopstate = manageStateFromPath;
    manageStateFromPath();
};
