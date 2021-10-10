/* eslint-disable import/no-webpack-loader-syntax */
// @ts-ignore
import Worker from "worker-loader!./worker";
import { TopHatDispatch } from "..";
import { AppSlice } from "../app";
import { DataSlice } from "../data";
import { db, TestObject } from "./database";

export const startup = () => {
    // Hydrate data store with appropriate data, and eventually run notification and data update logic
    // For now, just load test data
    TopHatDispatch(DataSlice.actions.setUpDemo());

    // Set up listener for forward/back browser buttons, correct initial path if necessary
    window.onpopstate = () => TopHatDispatch(AppSlice.actions.setPageStateFromPath());

    // Create Web Worker
    // const worker = Comlink.wrap<TopHatWorker>(new Worker());
    new Worker();

    db.on("changes", (changes) => changes.forEach((change) => console.log("DB OnChange Result:", change)));
    db.test.put(new TestObject(123, "Initial UI Value"));
};
