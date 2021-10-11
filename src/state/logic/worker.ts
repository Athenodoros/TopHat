import * as Comlink from "comlink";
import { TestObject, TopHatDexie } from "./database";

export interface TopHatWorkerService {
    addNumbers: (x: number, y: number) => number;
    initialiseAsWorker: (persistent?: boolean) => void;
}

let db: TopHatDexie;

export const TopHatWorker: TopHatWorkerService = {
    addNumbers: (x, y) => x + y,
    initialiseAsWorker: (persistent: boolean = true) => {
        if (persistent) {
            db = new TopHatDexie();
        } else {
            db = new TopHatDexie({
                indexedDB: require("fake-indexeddb"),
                IDBKeyRange: require("fake-indexeddb/lib/FDBKeyRange"),
            });
        }

        db.open();
        db.on("changes", () => {
            db.test.put(new TestObject(234, "Updated Value"));
        });
    },
};

Comlink.expose(TopHatWorker);
