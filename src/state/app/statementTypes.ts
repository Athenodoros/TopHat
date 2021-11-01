import { FileRejection } from "react-dropzone";
import { Account } from "../data";
import {
    DialogColumnExclusionConfig,
    DialogColumnParseResult,
    DialogColumnTransferConfig,
    DialogColumnValueMapping,
    DialogFileDescription,
    DialogParseSpecification,
} from "../logic/statement";

// Screens
interface DialogStatementPageState<Page extends string> {
    page: Page;
    account?: Account;
}
export interface DialogStatementFileState extends DialogStatementPageState<"file"> {
    rejections: FileRejection[];
}
export interface DialogStatementParseState extends DialogStatementPageState<"parse"> {
    file: string;
    parse: DialogParseSpecification;
    files: DialogFileDescription[];
    columns: DialogColumnParseResult<true>;
}
export interface DialogStatementMappingState extends DialogStatementPageState<"mapping"> {
    file: string;
    parse: DialogParseSpecification;
    files: DialogFileDescription[];
    columns: DialogColumnParseResult;
    mapping: DialogColumnValueMapping;
}
export interface DialogStatementImportState extends DialogStatementPageState<"import"> {
    file: string;
    parse: DialogParseSpecification;
    files: DialogFileDescription[];
    columns: DialogColumnParseResult;
    mapping: DialogColumnValueMapping;
    exclude: DialogColumnExclusionConfig;
    transfers: DialogColumnTransferConfig;
    reverse: boolean;
}

export type DialogFileState =
    | DialogStatementFileState
    | DialogStatementParseState
    | DialogStatementMappingState
    | DialogStatementImportState;
