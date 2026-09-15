import JSZip from "jszip";
import { batch } from "react-redux";
import { TopHatDispatch, TopHatStore } from "../../state";
import { AppSlice, JSONImportStatus } from "../../state/app";
import { DataSlice, DataState } from "../../state/data";
import { updateSyncedCurrencies } from "../../state/logic/currencies";
import { StubUserID } from "../data/types";
import { CURRENT_GENERATION, handleMigrationsAndUpdates } from "./storage/migrations";

export const importJSONData = (file: string) => importData(JSON.parse(file) as DataState);

export const importData = (data: DataState) =>
    batch(() => {
        TopHatDispatch(DataSlice.actions.setFromJSON(data));
        handleMigrationsAndUpdates(data.user.entities[StubUserID]?.generation);
        TopHatDispatch(DataSlice.actions.updateTransactionSummaryStartDates());

        updateSyncedCurrencies(); // Not awaited
    });

/** Read a normal JSON export, or a ZIP containing one (such as an old TopHat Dropbox backup), without importing it. */
export const readDataFile = async (file: File): Promise<DataState> => {
    const name = file.name.toLowerCase();

    if (name.endsWith(".json")) return parseDataJSON(await file.text());

    if (!name.endsWith(".zip")) throw new Error("Choose a TopHat JSON export, or a ZIP containing one.");

    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    // macOS adds resource-fork copies of each file under __MACOSX/ when zipping
    const files = zip.file(/\.json$/i).filter((entry) => !entry.name.startsWith("__MACOSX/"));

    if (files.length === 0)
        throw new Error(
            "This ZIP does not contain a JSON file. TopHat's CSV export cannot be restored as an application backup."
        );
    if (files.length > 1)
        throw new Error("This ZIP contains more than one JSON file, so TopHat can't tell which to use.");

    return parseDataJSON(await files[0].async("string"));
};

const parseDataJSON = (contents: string): DataState => {
    let data;
    try {
        data = JSON.parse(contents);
    } catch {
        throw new Error("This file isn't valid JSON, so it can't be a TopHat export.");
    }

    if (!data?.user?.entities?.[StubUserID]) throw new Error("This JSON file isn't a TopHat export.");

    const generation = data.user.entities[StubUserID].generation;
    if (typeof generation === "number" && generation > CURRENT_GENERATION)
        throw new Error(
            "This export was made by a newer version of TopHat. Reload this page to update TopHat, then try again."
        );

    return data;
};

/** Read a file dropped on or chosen from the tutorial, recording it in the app state for the tutorial to import. */
export const handleJSONFileUpload = async (files: File[]) => {
    if (TopHatStore.getState().app.jsonImport.type === "loading") return;

    if (files.length !== 1) {
        setJSONImportStatus({ type: "error", message: "Choose a single TopHat JSON export, or a ZIP containing one." });
        return;
    }

    setJSONImportStatus({ type: "loading" });
    try {
        setJSONImportStatus({ type: "loaded", name: files[0].name, data: await readDataFile(files[0]) });
    } catch (error) {
        setJSONImportStatus({
            type: "error",
            message: error instanceof Error ? error.message : "TopHat could not read this file.",
        });
    }
};

const setJSONImportStatus = (status: JSONImportStatus) => TopHatDispatch(AppSlice.actions.setJSONImportStatus(status));
