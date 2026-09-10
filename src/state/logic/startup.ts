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

export const initialiseAndGetDBConnection = async () => {
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

    /**
     * A Dropbox account linked by an earlier version becomes a sync target of its own.
     *
     * Awaited, so that a failure is reported rather than surfacing as an unhandled rejection - but
     * caught, because this is a handful of Dropbox requests and the app has not rendered yet. A
     * throw escaping here would leave the page blank rather than merely unlinked from Dropbox.
     */
    await migrateLegacyDropboxToken().catch((error) =>
        console.error("Could not take on the Dropbox account linked by an earlier version of TopHat", error)
    );

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
