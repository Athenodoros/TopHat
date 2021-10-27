import { useDialogState } from "../../../state/app/hooks";
import {
    DialogStatementImportState,
    DialogStatementMappingState,
    DialogStatementParseState,
} from "../../../state/app/statementTypes";

export const useNonFileDialogStatementState = () =>
    useDialogState("import") as DialogStatementParseState | DialogStatementMappingState | DialogStatementImportState;
