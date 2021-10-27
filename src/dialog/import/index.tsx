import { useDialogState } from "../../state/app/hooks";
import { DialogImportScreen } from "./import";
import { DialogImportFileScreen } from "./upload";

export const DialogImportView: React.FC = () => {
    const page = useDialogState("import", (state) => state.page);
    return page === "file" ? <DialogImportFileScreen /> : <DialogImportScreen />;
};
