import chroma from "chroma-js";
import { DateTime } from "luxon";
import Papa from "papaparse";
import { TopHatDispatch, TopHatStore } from "..";
import { formatNumber } from "../../shared/data";
import { AppSlice, BASE_PATHNAME } from "../app";
import { DataSlice } from "../data";
import { updateSyncedCurrencies } from "./currencies";
import { initialiseNotificationUpdateHook } from "./notifications";
import * as Statement from "./statement";
import * as Parsing from "./statement/parsing";
import { setupStorageAndLoadData } from "./storage";
import * as DBUtils from "./storage/dropbox";
import { migrateLegacyDropboxToken } from "./storage/dropbox";
import { TopHatStorageManager } from "./storage/manager";

const debug = !import.meta.env.PROD;

export const initialiseDemoData = async () => {
    const { DemoData } = await import("../data/demo/data");
    TopHatDispatch(DataSlice.actions.setUpDemo(DemoData));
    await updateSyncedCurrencies();
};

/**
 * Boot, which the app is already on screen for: `main.tsx` renders first, and what is shown follows
 * `app.storage` - the loading screen until the saved data is in, and the app once it is.
 *
 * Nothing here is allowed to escape. A failure before the storage state has been reported would
 * otherwise leave the loading screen up for good, with no way back and nothing said about why.
 */
export const initialiseAndGetDBConnection = async () => {
    try {
        await startTopHat();
    } catch (error) {
        console.error("TopHat could not start up", error);

        // Anything after the storage state is set has the app on screen, and is better logged than
        // shown: the alternative is hiding data that loaded perfectly well behind an error page
        if (TopHatStore.getState().app.storage.type !== "loading") return;

        TopHatDispatch(
            AppSlice.actions.setStorageState({
                type: "unreadable",
                error: getErrorMessage(error),
                rescuedRows: 0,
            })
        );
    }
};

const getErrorMessage = (error: unknown) =>
    error instanceof Error && error.message ? error.message : "TopHat could not read the data in this browser.";

const startTopHat = async () => {
    // Set up listener for forward/back browser buttons, correct initial path if necessary
    window.onpopstate = () => TopHatDispatch(AppSlice.actions.setPageStateFromPath());

    // Load whatever is already saved in this browser, and keep the store and it in step
    const { manager, storage } = await setupStorageAndLoadData(debug);
    TopHatDispatch(AppSlice.actions.setStorageState(storage));

    // Debug variables
    (window as any).getDebugVariablesAsync = getDebugVariablesAsync(manager);
    if (debug) Object.assign(window, await getDebugVariablesAsync(manager)());

    // Saved data that can't be read leaves the app on a recovery screen, so nothing else is started
    // up: none of it would be saved, and some of it would write over the data that is still there
    if (storage.type === "unreadable") return;

    // Add notification hook to data updates
    initialiseNotificationUpdateHook();

    // A Dropbox account linked by an earlier version becomes a sync target of its own. It is a
    // handful of Dropbox requests, and the app has been on screen since before any of this ran.
    await migrateLegacyDropboxToken();

    // Currency syncs
    updateSyncedCurrencies();

    // Update caches to latest month
    TopHatDispatch(DataSlice.actions.updateTransactionSummaryStartDates());
};

const getDebugVariablesAsync = (manager: TopHatStorageManager) => async () => {
    if (!debug)
        console.warn(
            "Warning! Using the variables in the debug tools can corrupt your data and have unpredictable results!"
        );

    return {
        manager,
        TopHatStore,
        TopHatDispatch,
        AppSlice,
        DataSlice,

        BASE_PATHNAME: BASE_PATHNAME,

        Papa,
        DateTime,
        _: await import("lodash-es"),
        chroma,

        Statement: { ...Statement, ...Parsing },
        DBUtils,
        formatNumber,

        updateSyncedCurrencies,
        removeUnusedStatements: () => TopHatDispatch(DataSlice.actions.removeUnusedStatements()),
        fitAccountUpdateDates: () => TopHatDispatch(DataSlice.actions.fitAccountLastUpdateDates()),
        restart: () => TopHatDispatch(DataSlice.actions.restartTutorial()),
        refreshCaches: () => TopHatDispatch(DataSlice.actions.refreshCaches()),
    };
};
