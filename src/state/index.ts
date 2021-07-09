import { configureStore } from "@reduxjs/toolkit";
import { AppSlice } from "./app";
import { DataSlice } from "./data";

export const TopHatStore = configureStore({
    reducer: {
        app: AppSlice.reducer,
        data: DataSlice.reducer,
    },
});

export type TopHatState = ReturnType<typeof TopHatStore["getState"]>;
export const TopHatDispatch = TopHatStore.dispatch;
