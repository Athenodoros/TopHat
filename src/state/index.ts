import { configureStore } from "@reduxjs/toolkit";
import { AppSlice } from "./app";
import { DataSlice } from "./data";

export const store = configureStore({
    reducer: {
        app: AppSlice.reducer,
        data: DataSlice.reducer,
    },
});

export type TopHatState = ReturnType<typeof store["getState"]>;
export const TopHatDispatch = store.dispatch;
