import { Dialog } from "@mui/material";
import { get } from "lodash";
import { useCallback, useContext, useEffect, useState } from "react";
import { FileHandlerContext } from "../app/context";
import { useDialogPage } from "../state/app/hooks";
import { closeDialogBox, DialogHeader } from "./header";
import { DialogImportView } from "./import";
import { DialogAccountsView } from "./objects/accounts";
import { DialogCategoriesView } from "./objects/categories";
import { DialogCurrenciesView } from "./objects/currencies";
import { DialogInstitutionsView } from "./objects/institutions";
import { DialogRulesView } from "./objects/rules";
import { DialogStatementView } from "./objects/statements";
import { DialogSettingsView } from "./settings";
import { DialogMain } from "./shared";

export const TopHatDialog: React.FC = () => {
    const state = useDialogPage();
    const { dropzoneRef, isDragActive } = useContext(FileHandlerContext);

    const onClose = useCallback(() => !isDragActive && closeDialogBox(), [isDragActive]);

    // This triggers a re-render after initial load, once the ref is populated
    const reRender = useState(false)[1];
    useEffect(() => void setTimeout(() => reRender(true), 0.1), [reRender]);

    if (!dropzoneRef?.current) return null;

    return (
        <Dialog
            open={state !== "closed" || isDragActive}
            onClose={onClose}
            PaperProps={DialogPaperSxProps}
            disablePortal={true} // This enables file dragover to still hit the dropzone with a full-page dialog
        >
            <DialogHeader />
            {isDragActive ? DialogPages.import : get(DialogPages, state, <DialogMain />)}
        </Dialog>
    );
};

const DialogPages = {
    account: <DialogAccountsView />,
    institution: <DialogInstitutionsView />,
    category: <DialogCategoriesView />,
    currency: <DialogCurrenciesView />,
    rule: <DialogRulesView />,
    statement: <DialogStatementView />,
    import: <DialogImportView />,
    settings: <DialogSettingsView />,
} as const;

const DialogPaperSxProps = {
    sx: {
        width: 900,
        maxWidth: "inherit",
        height: 600,
        overflow: "hidden",
    },
};
