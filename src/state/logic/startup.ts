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

export const initialiseAndGetDBConnection = async () => {
    // AppSlice changes the URL as soon as any action is fired and the reducer runs, so this has to be saved first
    const maybeDropboxCode = DBUtils.getMaybeDropboxRedirectCode();

    // Set up listener for forward/back browser buttons, correct initial path if necessary
    window.onpopstate = () => TopHatDispatch(AppSlice.actions.setPageStateFromPath());

    // Set up IDB, if present
    const { db, loadedStateFromIDB } = await setupIDBConnectionAndLoadData(debug);

    // If we're in a dropbox redirect loop, we don't want the initial empty state and popup -> silently set up demo
    if (!loadedStateFromIDB && maybeDropboxCode) await initialiseDemoData();

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

    // Update caches to latest month
    TopHatDispatch(DataSlice.actions.updateTransactionSummaryStartDates());

    // Debug variables
    (window as any).getDebugVariablesAsync = getDebugVariablesAsync(db);
    if (debug) Object.assign(window, await getDebugVariablesAsync(db)());
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
