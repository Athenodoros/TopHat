import Dexie, { DexieOptions } from "dexie";
import "dexie-observable";
import { ID } from "../shared/values";

// This class is so Typescript understands the shape of the DB connection
export class TopHatDexie extends Dexie {
    test: Dexie.Table<TestObject, ID>;
    // ...other tables goes here...

    constructor(options?: DexieOptions) {
        super("TopHatDatabase", options);
        this.version(1).stores({
            test: "$$id, value", // "$$" prefix is global across tabs, using dexie-observable
        });

        // This is for compatibility with babel-preset-typescript
        this.test = this.table("test");

        this.test.mapToClass(TestObject);
    }
}

export class TestObject {
    id: ID;
    value: string;

    constructor(id: ID, value: string) {
        this.id = id;
        this.value = value;
    }

    log() {
        console.log(JSON.stringify(this));
    }
}
