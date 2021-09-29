import { Transaction } from "../../data/types";
import { ID } from "../../shared/values";

type FILE_ID = string; // Automatically generated
type COLUMN_ID = string; // Automatically generated, unique within a file
type ROW_ID = number; // Index in list of parsed transactions

export interface DialogParseSpecification {
    header: boolean;
    delimiter?: string;
    dateFormat?: string;
}
export interface DialogFileDescription {
    id: FILE_ID;
    name: string;
    contents: string;
}

export interface TypedColumn<TypeName extends string, Type, Nullable extends boolean> {
    id: COLUMN_ID;
    name: string;
    type: TypeName;
    nullable: Nullable;
    raw: (string | (Nullable extends true ? null : never))[];
    values: (Type | (Nullable extends true ? null : never))[];
}
export type StringColumn<Nullable extends boolean> = TypedColumn<"string", string, Nullable>;
export type NumberColumn<Nullable extends boolean> = TypedColumn<"number", number, Nullable>;
export type DateColumn<Nullable extends boolean> = TypedColumn<"date", string, Nullable>;
export type ColumnProperties =
    | StringColumn<true>
    | NumberColumn<true>
    | DateColumn<true>
    | StringColumn<false>
    | NumberColumn<false>
    | DateColumn<false>;

export interface DialogColumnParseResult<Nullable extends boolean = false> {
    all: Record<
        FILE_ID,
        {
            file: FILE_ID;
            matches: boolean;
            columns?: ColumnProperties[];
        }
    >;
    common:
        | { id: COLUMN_ID; name: string; type: "string" | "number" | "date"; nullable: boolean }[]
        | (Nullable extends true ? undefined : never);
}

export interface DialogColumnCurrencyConstantMapping {
    type: "constant";
    currency: ID;
}
export interface DialogColumnCurrencyColumnMapping {
    type: "column";
    column: COLUMN_ID;
    field: "name" | "ticker" | "symbol";
}
export interface DialogColumnValueMapping {
    date: COLUMN_ID;
    reference?: COLUMN_ID;
    balance?: COLUMN_ID;
    value:
        | {
              type: "value";
              value?: COLUMN_ID;
              flip: boolean;
          }
        | {
              type: "split";
              credit?: COLUMN_ID;
              debit?: COLUMN_ID;
              flip: boolean;
          };
    currency: DialogColumnCurrencyConstantMapping | DialogColumnCurrencyColumnMapping;
}

export type DialogColumnExclusionConfig = Record<FILE_ID, ROW_ID[]>;
export type DialogColumnTransferConfig = Record<
    FILE_ID,
    Record<ROW_ID, { transaction?: Transaction; excluded?: boolean } | undefined>
>;
