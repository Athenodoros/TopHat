/** @vitest-environment jsdom */

import JSZip from "jszip";
import { beforeEach, expect, test, vi } from "vitest";
import { TopHatDispatch, TopHatStore } from "..";
import { AppSlice } from "../app";
import { DataSlice } from "../data";
import { StubUserID } from "../data/types";
import { handleJSONFileUpload, importData, readDataFile } from "./import";
import { CURRENT_GENERATION } from "./storage/migrations";

vi.mock("./currencies", () => ({ updateSyncedCurrencies: vi.fn(async () => undefined) }));

beforeEach(() => {
    TopHatDispatch(DataSlice.actions.reset());
    TopHatDispatch(AppSlice.actions.setJSONImportStatus({ type: "idle" }));
});

const exportJSON = () => {
    const state = structuredClone(TopHatStore.getState().data);
    state.user.entities[StubUserID]!.tutorial = false;
    state.user.entities[StubUserID]!.alphavantage = "restored";
    return JSON.stringify(state);
};

// jsdom's File doesn't implement text() or arrayBuffer()
const fileWithContents = (name: string, contents: string | ArrayBuffer) => {
    const file = new File([], name);
    Object.defineProperties(file, {
        text: { value: async () => (typeof contents === "string" ? contents : new TextDecoder().decode(contents)) },
        arrayBuffer: {
            value: async () => (typeof contents === "string" ? new TextEncoder().encode(contents).buffer : contents),
        },
    });
    return file;
};

const zipWithFiles = async (files: Record<string, string>) => {
    const zip = new JSZip();
    Object.entries(files).forEach(([name, contents]) => zip.file(name, contents));
    return zip.generateAsync({ type: "arraybuffer" });
};

test("reads a plain JSON export", async () => {
    const data = await readDataFile(fileWithContents("TopHat Data.json", exportJSON()));
    expect(data.user.entities[StubUserID]!.alphavantage).toBe("restored");
});

test("reads a JSON file of any name from a ZIP", async () => {
    const contents = await zipWithFiles({ "TopHat Data.json": exportJSON() });

    const data = await readDataFile(fileWithContents("backup.zip", contents));
    expect(data.user.entities[StubUserID]!.alphavantage).toBe("restored");
});

test("refuses JSON which isn't a TopHat export", async () => {
    await expect(readDataFile(fileWithContents("other.json", "{}"))).rejects.toThrow("isn't a TopHat export");
    await expect(readDataFile(fileWithContents("broken.json", "{"))).rejects.toThrow("isn't valid JSON");
});

test("refuses an export from a newer version of TopHat", async () => {
    const state = JSON.parse(exportJSON());
    state.user.entities[StubUserID].generation = CURRENT_GENERATION + 1;
    await expect(readDataFile(fileWithContents("future.json", JSON.stringify(state)))).rejects.toThrow(
        "newer version of TopHat"
    );
});

test("refuses a CSV export ZIP", async () => {
    const contents = await zipWithFiles({ "account.csv": "id,name\n1,Cheque" });
    await expect(readDataFile(fileWithContents("TopHat Data.zip", contents))).rejects.toThrow("CSV export");
});

test("refuses a ZIP with more than one JSON file", async () => {
    const contents = await zipWithFiles({ "data.json": exportJSON(), "other.json": exportJSON() });
    await expect(readDataFile(fileWithContents("data.zip", contents))).rejects.toThrow("more than one");
});

test("imports read data into the store", async () => {
    importData(await readDataFile(fileWithContents("TopHat Data.json", exportJSON())));
    expect(TopHatStore.getState().data.user.entities[StubUserID]!.alphavantage).toBe("restored");
});

test("records a tutorial file once it is read, without importing it", async () => {
    await handleJSONFileUpload([fileWithContents("TopHat Data.json", exportJSON())]);

    const status = TopHatStore.getState().app.jsonImport;
    if (status.type !== "loaded") throw new Error(`Expected a loaded file, not ${status.type}`);
    expect(status.name).toBe("TopHat Data.json");
    expect(status.data.user.entities[StubUserID]!.alphavantage).toBe("restored");
    expect(TopHatStore.getState().data.user.entities[StubUserID]!.alphavantage).not.toBe("restored");
});

test("records a tutorial file which can't be read", async () => {
    await handleJSONFileUpload([fileWithContents("notes.txt", "")]);
    expect(TopHatStore.getState().app.jsonImport).toEqual({
        type: "error",
        message: expect.stringContaining("JSON export"),
    });
});

test("refuses tutorial drops of anything but a single file", async () => {
    await handleJSONFileUpload([]);
    expect(TopHatStore.getState().app.jsonImport.type).toBe("error");
});

test("ignores a tutorial drop while a file is already being read", async () => {
    const first = handleJSONFileUpload([fileWithContents("TopHat Data.json", exportJSON())]);
    expect(TopHatStore.getState().app.jsonImport).toEqual({ type: "loading" });

    await handleJSONFileUpload([fileWithContents("notes.txt", "")]);
    expect(TopHatStore.getState().app.jsonImport).toEqual({ type: "loading" });

    await first;
    expect(TopHatStore.getState().app.jsonImport.type).toBe("loaded");
});
