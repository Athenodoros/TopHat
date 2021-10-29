import chroma from "chroma-js";
import Dexie from "dexie";
import { IDatabaseChange } from "dexie-observable/api";
import _, { uniq, zipObject } from "lodash-es";
import { DateTime } from "luxon";
import Papa from "papaparse";
import { TopHatDispatch, TopHatStore } from "..";
import { formatNumber } from "../../shared/data";
import { AppSlice } from "../app";
import { DataSlice, DataState, ListDataState, subscribeToDataUpdates } from "../data";
import { DataKeys, StubUserID } from "../data/types";
import { updateSyncedCurrencies } from "./currencies";
import { TopHatDexie } from "./database";
import * as DBUtils from "./dropbox";
import { initialiseNotificationUpdateHook } from "./notifications";
import { setIDBConnectionExists } from "./notifications/variants/idb";
import * as Statement from "./statement";
import * as Parsing from "./statement/parsing";

const debug = process.env.NODE_ENV !== "production";

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
        await DBUtils.dealWithDropboxRedirect(maybeDropboxCode);
    }
    initialiseMaybeDropboxSyncFromRedux();

    // Currency syncs
    updateSyncedCurrencies();

    // Debug variables
    if (debug) attachDebugVariablesToWindow(db);
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

const initialiseIDBSyncFromRedux = (db: TopHatDexie, uuid: string) =>
    subscribeToDataUpdates((previous) =>
        setTimeout(() => {
            db.transaction(
                "rw!",
                db.tables.filter(({ name }) => !name.startsWith("_")),
                (tx) => {
                    (tx as any).source = uuid;
                    const state = TopHatStore.getState().data;
                    DataKeys.forEach((key) => {
                        if (previous && previous[key] === state[key]) return;

                        const ids = uniq((previous ? previous[key].ids : []).concat(state[key].ids));
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
                }
            );
        }, 0)
    );

const initialiseMaybeDropboxSyncFromRedux = () =>
    subscribeToDataUpdates(() => setTimeout(() => DBUtils.maybeSaveDataToDropbox(), 0));

type DBDataTables = keyof Omit<DataState, "transaction"> | "transaction_";
const hydrateReduxFromIDB = async (db: TopHatDexie) => {
    const values = await Promise.all(
        DataKeys.map(
            (name) => db[name === "transaction" ? "transaction_" : (name as DBDataTables)].toArray() as Promise<unknown>
        )
    );

    TopHatDispatch(DataSlice.actions.setFromLists(zipObject(DataKeys, values) as unknown as ListDataState));
};

const attachDebugVariablesToWindow = (db: TopHatDexie) => {
    (window as any).Papa = Papa;
    (window as any).DateTime = DateTime;
    (window as any)._ = _;
    (window as any).chroma = chroma;
    (window as any).store = TopHatStore;
    (window as any).AppSlice = AppSlice;
    (window as any).DataSlice = DataSlice;
    (window as any).Statement = { ...Statement, ...Parsing };
    (window as any).db = db;
    (window as any).DBUtils = DBUtils;
    (window as any).restart = () => TopHatDispatch(DataSlice.actions.restartTutorial());
    (window as any).formatNumber = formatNumber;

    console.log("Setting up debug variables...");
};
