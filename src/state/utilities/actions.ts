import { createAction } from "@reduxjs/toolkit";
import { EditTransactionState } from "../app/pageTypes";
import { ID } from "./values";

export const SaveTransactionTableSelectionState = createAction<{ ids: ID[]; edits: EditTransactionState }>(
    "SaveTransactionTableSelectionState"
);
export const DeleteTransactionSelectionState = createAction<ID[]>("DeleteTransactionTableSelectionState");
