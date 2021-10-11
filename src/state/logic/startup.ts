import axios from "axios";
import chroma from "chroma-js";
import * as Comlink from "comlink";
import _, { mapValues } from "lodash-es";
import { DateTime } from "luxon";
import numeral from "numeral";
import Papa from "papaparse";
/* eslint-disable import/no-webpack-loader-syntax */
// @ts-ignore
import Worker from "worker-loader!./worker";
import { TopHatDispatch, TopHatStore } from "..";
import { AppSlice } from "../app";
import { DataSlice } from "../data";
import { TestObject, TopHatDexie } from "./database";
import * as Statement from "./statement";
import * as Parsing from "./statement/parsing";
import { TopHatWorker, TopHatWorkerService } from "./worker";

type AsyncTopHatWorkerService = {
    [Key in keyof TopHatWorkerService]: TopHatWorkerService[Key] extends (...args: infer T) => infer U
        ? (...args: T) => Promise<U>
        : never;
};

export const initialiseAndGetDBConnection = async (debug: boolean = false) => {
    // Hydrate data store with appropriate data, and eventually run notification and data update logic
    // For now, just load test data
    TopHatDispatch(DataSlice.actions.setUpDemo());

    // Set up listener for forward/back browser buttons, correct initial path if necessary
    window.onpopstate = () => TopHatDispatch(AppSlice.actions.setPageStateFromPath());

    // Work and IDB testing
    const {
        db,
        worker,
    }: {
        db: TopHatDexie;
        worker: AsyncTopHatWorkerService;
    } = await new Promise((resolve) => {
        let db = new TopHatDexie();
        db.open()
            .then(() => {
                if (debug) {
                    db.delete();
                    db.open();
                }

                const worker = Comlink.wrap<TopHatWorkerService>(new Worker());

                worker.initialiseAsWorker().then(() => resolve({ db, worker }));
            })
            .catch(Error, () => {
                db = new TopHatDexie({
                    indexedDB: require("fake-indexeddb"),
                    IDBKeyRange: require("fake-indexeddb/lib/FDBKeyRange"),
                });

                const worker = mapValues(
                    TopHatWorker,
                    <T extends Array<any>, U>(fn: (...args: T) => U) =>
                        (...args: T): Promise<U> =>
                            new Promise((resolve) => resolve(fn(...args)))
                ) as unknown as AsyncTopHatWorkerService;

                worker.initialiseAsWorker(false).then(() => resolve({ db, worker }));
            });
    });

    worker.addNumbers(1, 2).then(console.log);
    db.on("changes", (changes) => changes.forEach((change) => console.log("DB OnChange Result:", change)));
    db.test.put(new TestObject(123, "Initial UI Value"));

    // Debug variables
    if (debug) {
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

        console.log("Setting up debug variables...");
    }
};
