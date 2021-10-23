import axios from "axios";
import chroma from "chroma-js";
import Dexie from "dexie";
import { Dropbox, DropboxAuth } from "dropbox";
import _, { keys, uniq, zipObject } from "lodash-es";
import { DateTime } from "luxon";
import numeral from "numeral";
import Papa from "papaparse";
import { TopHatDispatch, TopHatStore } from "..";
import { AppSlice } from "../app";
import { DataDefaults, DataSlice, DataState, ListDataState, subscribeToDataUpdates } from "../data";
import { StubUserID } from "../data/types";
import { TopHatDexie } from "./database";
import * as DBUtils from "./dropbox";
import { initialiseNotificationUpdateHook } from "./notifications";
import * as Statement from "./statement";
import * as Parsing from "./statement/parsing";

const debug = process.env.NODE_ENV !== "production";

export const initialiseAndGetDBConnection = async () => {
    const maybeDropboxCode = DBUtils.getMaybeDropboxRedirectCode();

    // Set up listener for forward/back browser buttons, correct initial path if necessary
    window.onpopstate = () => TopHatDispatch(AppSlice.actions.setPageStateFromPath());

    // Initial hydration of DB and Redux store
    let db = new TopHatDexie();
    await db.user
        .get(StubUserID)
        .then(async (user) => {
            // const worker = getWorker();
            // await worker.run();

            if (debug) {
                console.log("In debug mode - bypassing IndexedDB...");
                TopHatDispatch(DataSlice.actions.setUpDemo());
                return;
            }

            if (user) {
                // IDB contains existing TopHat state
                if (debug) console.log("Hydrating store from IndexedDB...");
                await hydrateReduxFromIDB(TopHatStore, db);
                initialiseNotificationUpdateHook();
                initialiseIDBSyncFromRedux(db);
            } else {
                // Nothing in IDB - set up demo
                if (debug) console.log("No data found in IndexedDB - setting up demo...");
                initialiseIDBSyncFromRedux(db);
                initialiseNotificationUpdateHook();
                TopHatDispatch(DataSlice.actions.setUpDemo());
                // await worker.initialiseDemoData();
            }
        })
        .catch(async () => {
            // IDB isn't working, probably Firefox incognito => set up demo
            if (debug) console.log("Can't use IndexedDB - setting up demo without syncing...");

            // db = new TopHatDexie({
            //     indexedDB: require("fake-indexeddb"),
            //     IDBKeyRange: require("fake-indexeddb/lib/FDBKeyRange"),
            // });

            // initialiseIDBSyncFromRedux(TopHatStore, db);
            initialiseNotificationUpdateHook();
            TopHatDispatch(DataSlice.actions.setUpDemo());

            // const worker = getMockWorker();
            // await worker.run(false);

            // await worker.initialiseDemoData();
        });

    // attachIDBChangeHandler(db, handleIDBChanges(TopHatStore.dispatch));

    if (maybeDropboxCode) {
        if (debug) console.log("Initialising Dropbox state from redirect...");
        DBUtils.dealWithDropboxRedirect(maybeDropboxCode);
    }
    initialiseMaybeDropboxSyncFromRedux();

    // Debug variables
    if (debug) attachDebugVariablesToWindow(db);
};

// const handleIDBChanges = (dispatch: typeof TopHatDispatch) => (changes: IDatabaseChange[]) =>
//     dispatch(DataSlice.actions.syncIDBChanges(changes));

export const DataKeys = keys(DataDefaults) as (keyof DataState)[];

const initialiseIDBSyncFromRedux = (db: TopHatDexie) =>
    subscribeToDataUpdates((previous, state) => {
        DataKeys.forEach((key) => {
            if (previous && previous[key] === state[key]) return;

            const ids = uniq((previous ? previous[key].ids : []).concat(state[key].ids));
            const deleted = previous
                ? ids.filter((id) => previous[key].entities[id] !== undefined && state[key].entities[id] === undefined)
                : [];
            const updated = ids.filter(
                (id) => state[key].entities[id] && (!previous || previous[key].entities[id] !== state[key].entities[id])
            );

            if (deleted.length) db[key === "transaction" ? "transaction_" : key].bulkDelete(deleted);
            if (updated.length)
                (db[key === "transaction" ? "transaction_" : key] as Dexie.Table).bulkPut(
                    updated.map((id) => state[key].entities[id]!)
                );
        });
    });

const initialiseMaybeDropboxSyncFromRedux = () =>
    subscribeToDataUpdates((_, state) => DBUtils.maybeSaveDataToDropbox(state));

type DBDataTables = keyof Omit<DataState, "transaction"> | "transaction_";
const hydrateReduxFromIDB = async (store: typeof TopHatStore, db: TopHatDexie) => {
    const values = await Promise.all(
        DataKeys.map(
            (name) => db[name === "transaction" ? "transaction_" : (name as DBDataTables)].toArray() as Promise<unknown>
        )
    );

    store.dispatch(DataSlice.actions.setFromLists(zipObject(DataKeys, values) as unknown as ListDataState));
};

// type AsyncTopHatWorkerService = {
//     [Key in keyof TopHatWorkerService]: TopHatWorkerService[Key] extends (...args: infer T) => infer U
//         ? (...args: T) => Promise<U>
//         : never;
// };
// const getMockWorker = () =>
//     mapValues(
//         TopHatWorker,
//         <T extends Array<any>, U>(fn: (...args: T) => U) =>
//             (...args: T): Promise<U> =>
//                 new Promise((resolve) => resolve(fn(...args)))
//     ) as unknown as AsyncTopHatWorkerService;
// const getWorker = () => Comlink.wrap<TopHatWorkerService>(new Worker());

const attachDebugVariablesToWindow = (db: TopHatDexie) => {
    (window as any).Papa = Papa;
    (window as any).DateTime = DateTime;
    (window as any).numeral = numeral;
    (window as any)._ = _;
    (window as any).chroma = chroma;
    (window as any).store = TopHatStore;
    (window as any).axios = axios;
    (window as any).AppSlice = AppSlice;
    (window as any).DataSlice = DataSlice;
    (window as any).Statement = { ...Statement, ...Parsing };
    (window as any).db = db;
    (window as any).DBUtils = DBUtils;
    (window as any).Dropbox = Dropbox;
    (window as any).DropboxAuth = DropboxAuth;

    console.log("Setting up debug variables...");
};
