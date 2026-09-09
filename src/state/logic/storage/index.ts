import Dexie from "dexie";
import { IDatabaseChange } from "dexie-observable/api";
import { uniq } from "lodash-es";
import { TopHatDispatch, TopHatStore } from "../..";
import { zipObject } from "../../../shared/data";
import { DataSlice, ListDataState, subscribeToDataUpdates } from "../../data";
import { DataKeys, DataState, StubUserID } from "../../data/types";
import { ID } from "../../shared/values";
import { setIDBConnectionExists } from "../notifications/variants/idb";
import { TopHatDexie } from "./database";
import { handleMigrationsAndUpdates } from "./migrations";

export const setupIDBConnectionAndLoadData = async (debug: boolean) => {
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
            initialiseIDBListener(db, uuid, debug);
            setIDBConnectionExists(true);
        })
        .catch(async () => {
            // TODO: tell "there is no data" apart from "the data could not be read". Both end up
            // here, and both start the app in its tutorial state, so a read that fails against data
            // that is really there looks to the user like a brand new install. Storage should only
            // be written when we know the database is empty, rather than when reading it went wrong.
            if (debug) console.log("IndexedDB connection failed - bypassing initial load...");
        });

    return { db, loadedStateFromIDB };
};

type DBDataTables = keyof Omit<DataState, "transaction"> | "transaction_";
const hydrateReduxFromIDB = async (db: TopHatDexie) => {
    const values = await Promise.all(
        DataKeys.map(
            (name) => db[name === "transaction" ? "transaction_" : (name as DBDataTables)].toArray() as Promise<unknown>
        )
    );

    TopHatDispatch(DataSlice.actions.setFromIndexedDB(zipObject(DataKeys, values) as unknown as ListDataState));
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

const initialiseIDBListener = (db: TopHatDexie, uuid: string, debug: boolean) => {
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
