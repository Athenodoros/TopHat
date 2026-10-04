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
import { setupStorageAndLoadData, showStorageStateAfterBoot } from "./storage";
import * as DBUtils from "./storage/dropbox";
import { moveLegacyDropboxLink } from "./storage/dropbox";
import { StorageConnection } from "./storage/types";

const debug = !import.meta.env.PROD;

export const initialiseDemoData = async () => {
    const { DemoData } = await import("../data/demo/data");
    TopHatDispatch(DataSlice.actions.setUpDemo(DemoData));
    await updateSyncedCurrencies();
};

/**
 * Boots TopHat, with the app already on screen and following `app.storage`.
 *
 * Nothing is allowed to escape: a failure before the storage state is set would otherwise leave
 * the loading page up for good, with nothing said about why.
 */
export const initialiseAndGetDBConnection = async () => {
    try {
        await startTopHat();
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

const startTopHat = async () => {
    // Set up listener for forward/back browser buttons, correct initial path if necessary
    window.onpopstate = () => TopHatDispatch(AppSlice.actions.setPageStateFromPath());

    // Set up IDB, if present
    const { connection, storage } = await setupStorageAndLoadData(debug);

    // Debug variables
    (window as any).getDebugVariablesAsync = getDebugVariablesAsync(connection);
    if (debug) Object.assign(window, await getDebugVariablesAsync(connection)());

    // Saved data that can't be read leaves the app on a recovery screen, so nothing else is started
    // up: none of it would be saved, and some of it would write over the data that is still there
    if (storage.type === "unreadable") {
        TopHatDispatch(AppSlice.actions.setStorageState(storage));
        return;
    }

    // Another tab may have saved data this one can't use while boot was waiting. This is the last chance
    // not to replace the recovery screen storage is about to show, or start the syncs that would change
    // what this tab holds.
    if (connection.hasFrozenForRecovery()) return;

    // Update caches to latest month. The app shows "undo" snacks once the storage state is set, so boot's
    // own data changes are made before it: they never showed a snack when the app only rendered after boot.
    TopHatDispatch(DataSlice.actions.updateTransactionSummaryStartDates());

    // Storage may be waiting for the user to choose between copies that disagree, which stays on screen
    showStorageStateAfterBoot(storage);

    // Add notification hook to data updates
    initialiseNotificationUpdateHook();

    // Currency syncs
    updateSyncedCurrencies();

    // The Dropbox link an earlier version made becomes a linked account. It takes a few requests to
    // Dropbox, with the app on screen, and reports its own failures rather than throwing them.
    await moveLegacyDropboxLink();
};

const getDebugVariablesAsync = (connection: StorageConnection) => async () => {
    if (!debug)
        console.warn(
            "Warning! Using the variables in the debug tools can corrupt your data and have unpredictable results!"
        );

    return {
        connection: connection.debugVariables,
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
