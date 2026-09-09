import Dexie from "dexie";
import { IDatabaseChange } from "dexie-observable/api";
import { uniq } from "lodash-es";
import { TopHatDispatch, TopHatStore } from "../..";
import { zipObject } from "../../../shared/data";
import { DataSlice, ListDataState, subscribeToDataUpdates } from "../../data";
import { DataKeys, DataState, StubUserID, User } from "../../data/types";
import { ID } from "../../shared/values";
import { setIDBConnectionExists } from "../notifications/variants/idb";
import { DATABASE_NAME, TopHatDexie } from "./database";
import { handleMigrationsAndUpdates } from "./migrations";
import { rescueDatabaseContents } from "./rescue";
import { StorageState } from "./types";

export const setupIDBConnectionAndLoadData = async (debug: boolean) => {
    // Set up IDB, if present
    const db = new TopHatDexie();

    let user: User | undefined;
    try {
        user = await db.user.get(StubUserID);

        if (user) {
            // IDB contains existing TopHat state
            if (debug) console.log("Hydrating store from IndexedDB...");
            await hydrateReduxFromIDB(db);
            handleMigrationsAndUpdates(user.generation);
        }
    } catch (error) {
        return { db, storage: await getStorageFailureState(db, error, debug) };
    }

    const uuid = "" + new Date().getTime() + Math.random();
    initialiseIDBSyncFromRedux(db, uuid);
    initialiseIDBListener(db, uuid, debug);
    setIDBConnectionExists(true);

    const storage: StorageState = user ? { type: "loaded" } : { type: "empty" };
    return { db, storage };
};

/**
 * Tells "there is no data" apart from "the data could not be read", so that a database which is
 * really there is never written over by the empty state that a failed read would otherwise leave
 * the app in. `Dexie.exists` opens the database as it stands, without the schema that TopHat has
 * just failed to open it with, so it answers whether there is anything there to lose.
 */
const getStorageFailureState = async (db: TopHatDexie, error: unknown, debug: boolean): Promise<StorageState> => {
    const description = error instanceof Error ? error.message : "" + error;
    if (debug) console.log("Could not load data from IndexedDB: " + description);

    // Dexie says the same thing again on a second line, and only the first is worth showing
    const message = description.split("\n")[0].trim();

    db.close();
    setIDBConnectionExists(false);
    const exists = await Dexie.exists(DATABASE_NAME).catch(() => false);
    if (!exists) return { type: "unavailable", error: message };

    return { type: "unreadable", error: message, rescuedRows: await rescueDatabaseContents() };
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
