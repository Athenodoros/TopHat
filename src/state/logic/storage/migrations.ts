import { TopHatDispatch } from "../..";
import { DataSlice } from "../../data";

// This handles data changes over time, or required cache refreshes
export const handleMigrationsAndUpdates = (oldGeneration: number | undefined) => {
    let generation = oldGeneration ?? 0;

    // Migrations for each generation, with batched cache refreshes
    if (
        generation === 0 || // Refresh caches to deal with https://github.com/Athenodoros/TopHat/issues/8
        generation === 1 || // Refresh caches to deal with https://github.com/Athenodoros/TopHat/issues/13
        generation === 2 || // Fix incorrect rate ordering in earlier manual currency data input
        generation === 3 // Fix incorrect currency conversions for rate updates in default currency
    ) {
        TopHatDispatch(DataSlice.actions.refreshCaches());
        generation = 4;
    }

    if (generation === 4) {
        TopHatDispatch(DataSlice.actions.createInitialPatchState());
        generation = 5;
    }

    // Update app state
    if (oldGeneration !== generation) {
        console.log("Updated user data to generation: " + generation);
        TopHatDispatch(DataSlice.actions.setUserGeneration(generation));
    }
};
