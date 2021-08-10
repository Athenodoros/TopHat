import { useDialogState } from "../../../state/app/hooks";
import { DialogFileState } from "../../../state/app/statementTypes";
import { DialogImportFileScreen } from "./screens/file";
import { DialogImportParseScreen } from "./screens/parse";

export const DialogImportView: React.FC = () => {
    const page = useDialogState("import", (state) => state.page);

    return Pages[page];
};

const Pages: Record<DialogFileState["page"], React.ReactElement> = {
    file: <DialogImportFileScreen />,
    parse: <DialogImportParseScreen />,
    mapping: <div />,
    import: <div />,
};
