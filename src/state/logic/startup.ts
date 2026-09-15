import chroma from "chroma-js";
import { DateTime } from "luxon";
import Papa from "papaparse";
import { TopHatDispatch, TopHatStore } from "..";
import { formatNumber } from "../../shared/data";
import { AppSlice, BASE_PATHNAME } from "../app";
import { DataSlice, subscribeToDataUpdates } from "../data";
import { updateSyncedCurrencies } from "./currencies";
import * as DBUtils from "./dropbox";
import { initialiseNotificationUpdateHook } from "./notifications";
import * as Statement from "./statement";
import * as Parsing from "./statement/parsing";
import { setupIDBConnectionAndLoadData } from "./storage";
import { TopHatDexie } from "./storage/database";

const debug = !import.meta.env.PROD;

export const initialiseDemoData = async () => {
    const { DemoData } = await import("../data/demo/data");
    TopHatDispatch(DataSlice.actions.setUpDemo(DemoData));
    await updateSyncedCurrencies();
};

/**
 * Boots TopHat, with the app already on screen and following `app.storage`.
 *
 * `maybeDropboxCode` is read by the caller before anything is rendered, because AppSlice rewrites
 * the URL the first time an action runs.
 *
 * Nothing is allowed to escape: a failure before the storage state is set would otherwise leave
 * the loading page up for good, with nothing said about why.
 */
export const initialiseAndGetDBConnection = async (maybeDropboxCode: string | undefined) => {
    try {
        await startTopHat(maybeDropboxCode);
    } catch (exception) {
        console.error("TopHat could not start up", exception);

        // Once the storage state is set the app is on screen, and a later failure (say, in a sync) is
        // better logged than shown: the alternative is hiding data that loaded perfectly well
        if (TopHatStore.getState().app.storage.type !== "loading") return;

        // Otherwise the app never appeared. Unreadable data is reported by storage itself rather than
        // thrown, so this isn't a reason to offer to delete anything - just to say what went wrong
        const error = (exception instanceof Error && exception.message) || "TopHat could not start up.";
        TopHatDispatch(AppSlice.actions.setStorageState({ type: "failed", error }));
    }
};

const startTopHat = async (maybeDropboxCode: string | undefined) => {
    // Set up listener for forward/back browser buttons, correct initial path if necessary
    window.onpopstate = () => TopHatDispatch(AppSlice.actions.setPageStateFromPath());

    // Set up IDB, if present
    const { db, storage } = await setupIDBConnectionAndLoadData(debug);

    // Debug variables
    (window as any).getDebugVariablesAsync = getDebugVariablesAsync(db);
    if (debug) Object.assign(window, await getDebugVariablesAsync(db)());

    // Saved data that can't be read leaves the app on a recovery screen, so nothing else is started
    // up: none of it would be saved, and some of it would write over the data that is still there
    if (storage.type === "unreadable") {
        TopHatDispatch(AppSlice.actions.setStorageState(storage));
        return;
    }

    // The app shows "undo" snacks once the storage state is set, so boot's own data changes are made
    // before it: they never showed a snack when the app only rendered after boot

    // If we're in a dropbox redirect loop, we don't want the initial empty state and popup -> silently set up demo
    if (storage.type !== "loaded" && maybeDropboxCode) await initialiseDemoData();

    // Update caches to latest month
    TopHatDispatch(DataSlice.actions.updateTransactionSummaryStartDates());

    TopHatDispatch(AppSlice.actions.setStorageState(storage));

    // Add notification hook to data updates
    initialiseNotificationUpdateHook();

    // Dropbox setup
    if (maybeDropboxCode) {
        if (debug) console.log("Initialising Dropbox state from redirect...");
        DBUtils.dealWithDropboxRedirect(maybeDropboxCode);
    }
    initialiseMaybeDropboxSyncFromRedux();

    // Currency syncs
    updateSyncedCurrencies();
};

const initialiseMaybeDropboxSyncFromRedux = () =>
    subscribeToDataUpdates(() => setTimeout(() => DBUtils.maybeSaveDataToDropbox(), 0));

const getDebugVariablesAsync = (db: TopHatDexie) => async () => {
    if (!debug)
        console.warn(
            "Warning! Using the variables in the debug tools can corrupt your data and have unpredictable results!"
        );

    return {
        db,
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
