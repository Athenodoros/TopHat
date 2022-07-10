import { batch } from "react-redux";
import { TopHatDispatch } from "../../state";
import { DataSlice, DataState } from "../../state/data";
import { updateSyncedCurrencies } from "../../state/logic/currencies";
import { StubUserID } from "../data/types";
import { handleMigrationsAndUpdates } from "./startup";

export const importJSONData = (file: string) =>
    batch(() => {
        const data = JSON.parse(file) as DataState;
        TopHatDispatch(DataSlice.actions.set(data));
        handleMigrationsAndUpdates(data.user.entities[StubUserID]?.generation);
        TopHatDispatch(DataSlice.actions.updateTransactionSummaryStartDates());

        updateSyncedCurrencies(); // Not awaited
    });
