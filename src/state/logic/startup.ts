import chroma from "chroma-js";
import Dexie from "dexie";
import { IDatabaseChange } from "dexie-observable/api";
import { uniq, zipObject } from "lodash-es";
import { DateTime } from "luxon";
import Papa from "papaparse";
import { TopHatDispatch, TopHatStore } from "..";
import { formatNumber } from "../../shared/data";
import { AppSlice, BASE_PATHNAME } from "../app";
import { DataSlice, DataState, ListDataState, subscribeToDataUpdates } from "../data";
import { DataKeys, StubUserID } from "../data/types";
import { ID } from "../shared/values";
import { updateSyncedCurrencies } from "./currencies";
import { TopHatDexie } from "./database";
import * as DBUtils from "./dropbox";
import { initialiseNotificationUpdateHook } from "./notifications";
import { setIDBConnectionExists } from "./notifications/variants/idb";
import * as Statement from "./statement";
import * as Parsing from "./statement/parsing";

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
    let db = new TopHatDexie();
    let loadedStateFromIDB = false;
    await db.user
        .get(StubUserID)
        .then(async (user) => {
            if (user) {
                // IDB contains existing TopHat state
                if (debug) console.log("Hydrating store from IndexedDB...");
                await hydrateReduxFromIDB(db);
                handleMigrationsAndUpdates(user.generation);
                loadedStateFromIDB = true;
            }

            const uuid = "" + new Date().getTime() + Math.random();
            initialiseIDBSyncFromRedux(db, uuid);
            initialiseIDBListener(db, uuid);
            setIDBConnectionExists(true);
        })
        .catch(async () => {
            if (debug) console.log("IndexedDB connection failed - bypassing initial load...");
        });

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

const initialiseIDBListener = (db: TopHatDexie, uuid: string) => {
    let running: IDatabaseChange[] = [];
    db.on("changes", (changes, partial) => {
        if (partial) {
            running = running.concat(changes);
            return;
        } else {
            changes = running.concat(changes);
            running = [];
        }

        if (changes.some((change) => change.source !== uuid)) {
            if (debug) console.log("Updating Redux from IDB...");
            hydrateReduxFromIDB(db);
        }
    });
};

const initialiseIDBSyncFromRedux = (db: TopHatDexie, uuid: string) => {
    let syncHasRun = false;

    subscribeToDataUpdates((previous) =>
        setTimeout(() => {
            db.transaction(
                "rw!",
                db.tables.filter(({ name }) => !name.startsWith("_")),
                (tx) => {
                    (tx as any).source = uuid;

                    const state = TopHatStore.getState().data;
                    DataKeys.forEach((key) => {
                        if (syncHasRun && previous && previous[key] === state[key]) return;

                        if (!syncHasRun) {
                            (db[key === "transaction" ? "transaction_" : key] as Dexie.Table).bulkPut(
                                state[key].ids.map((id) => state[key].entities[id]!)
                            );
                            return;
                        }

                        const ids = uniq((previous ? previous[key].ids : []).concat(state[key].ids)) as ID[];
                        const deleted = previous
                            ? ids.filter(
                                  (id) =>
                                      previous[key].entities[id] !== undefined && state[key].entities[id] === undefined
                              )
                            : [];
                        const updated = ids.filter(
                            (id) =>
                                state[key].entities[id] &&
                                (!previous || previous[key].entities[id] !== state[key].entities[id])
                        );

                        if (deleted.length) db[key === "transaction" ? "transaction_" : key].bulkDelete(deleted);
                        if (updated.length)
                            (db[key === "transaction" ? "transaction_" : key] as Dexie.Table).bulkPut(
                                updated.map((id) => state[key].entities[id]!)
                            );
                    });

                    syncHasRun = true;
                }
            );
        }, 0)
    );
};

const initialiseMaybeDropboxSyncFromRedux = () =>
    subscribeToDataUpdates(() => setTimeout(() => DBUtils.maybeSaveDataToDropbox(), 0));

type DBDataTables = keyof Omit<DataState, "transaction"> | "transaction_";
const hydrateReduxFromIDB = async (db: TopHatDexie) => {
    const values = await Promise.all(
        DataKeys.map(
            (name) => db[name === "transaction" ? "transaction_" : (name as DBDataTables)].toArray() as Promise<unknown>
        )
    );

    TopHatDispatch(DataSlice.actions.setFromIndexedDB(zipObject(DataKeys, values) as unknown as ListDataState));
};

// This handles data changes over time, or required cache refreshes
export const handleMigrationsAndUpdates = (oldGeneration: number | undefined) => {
    let generation = oldGeneration ?? 0;

    // Migrations for each generation, with batched cache refreshes
    if (
        generation === 0 || // Refresh caches to deal with https://github.com/Athenodoros/TopHat/issues/8
        generation === 1 || // Refresh caches to deal with https://github.com/Athenodoros/TopHat/issues/13
        generation === 2 || // Fix incorrect rate ordering in earlier manual currency data input
        generation === 3 // Fix incorrect currency conversions for rate updates in default currency
    ) {
        TopHatDispatch(DataSlice.actions.refreshCaches());
        generation = 4;
    }

    if (generation === 4) {
        TopHatDispatch(DataSlice.actions.createInitialPatchState());
        generation = 5;
    }

    // Update app state
    if (oldGeneration !== generation) {
        console.log("Updated user data to generation: " + generation);
        TopHatDispatch(DataSlice.actions.setUserGeneration(generation));
    }
};

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
