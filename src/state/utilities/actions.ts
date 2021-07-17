import { createAction } from "@reduxjs/toolkit";
import { EditTransactionState } from "../app/types";
import { ID } from "./values";

export const SaveTransactionSelectionState = createAction<{ ids: ID[]; edits: EditTransactionState }>(
    "SaveTransactionSelectionState"
);
export const DeleteTransactionSelectionState = createAction<ID[]>("DeleteTransactionSelectionState");