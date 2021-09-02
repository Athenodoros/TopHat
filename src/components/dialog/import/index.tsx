import { useDialogState } from "../../../state/app/hooks";
import { DialogImportFileScreen } from "./screens/file";
import { DialogImportScreen } from "./screens/import";

export const DialogImportView: React.FC = () => {
    const page = useDialogState("import", (state) => state.page);
    return page === "file" ? <DialogImportFileScreen /> : <DialogImportScreen />;
};
