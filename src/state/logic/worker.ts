import * as Comlink from "comlink";
import { TopHatDexie } from "./database";

export interface TopHatWorkerService {
    run: (persistent?: boolean) => Promise<void>;
}

let db: TopHatDexie;

export const TopHatWorker: TopHatWorkerService = {
    run: async (idb: boolean = true) => {
        if (idb) {
            db = new TopHatDexie();
        } else {
            db = new TopHatDexie({
                indexedDB: require("fake-indexeddb"),
                IDBKeyRange: require("fake-indexeddb/lib/FDBKeyRange"),
            });
        }

        await db.open();
        // attachIDBChangeHandler(db, handleIDBChanges);
    },
};

// // Copied from Dexie's DatabaseChangeType
// const ChangeType = {
//     CREATE: 1,
//     UPDATE: 2,
//     DELETE: 3,
// } as const;

// const handleIDBChanges = async (changes: IDatabaseChange[]) => {
// };

Comlink.expose(TopHatWorker);
