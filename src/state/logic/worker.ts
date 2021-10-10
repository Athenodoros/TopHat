import * as Comlink from "comlink";
import { db, TestObject } from "./database";

export interface TopHatWorker {
    addNumbers: (x: number, y: number) => number;
}

const worker: TopHatWorker = {
    addNumbers: (x, y) => x + y,
};

db.open();
db.on("changes", () => {
    console.log("Creating new test");
    db.test.put(new TestObject(345, "Updated Value"));
});

Comlink.expose(worker);
