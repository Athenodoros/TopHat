import { Button, Checkbox, StepContent, Tooltip, Typography } from "@mui/material";
import { useState } from "react";
import { handleCheckboxChange } from "../../../shared/events";
import { TopHatDispatch, TopHatStore } from "../../../state";
import { AppSlice } from "../../../state/app";
import { useDialogState } from "../../../state/app/hooks";
import { DialogStatementImportState } from "../../../state/app/statementTypes";
import {
    canImportStatementsAndClearDialog,
    goBackToStatementMapping,
    importStatementsAndClearDialog,
} from "../../../state/logic/statement";
import { DialogImportActionsBox, DialogImportOptionBox, DialogImportOptionsContainerBox } from "./shared";

export const DialogImportImportStepContent: React.FC<{
    shouldDetectTransfers: boolean;
    setShouldDetectTransfers: (value: boolean) => void;
}> = ({ shouldDetectTransfers, setShouldDetectTransfers }) => {
    const [shouldRunRules, setShouldRunRules] = useState(true);
    const reversed = useDialogState("import", (state) => (state as DialogStatementImportState).reverse);

    return (
        <StepContent>
            <DialogImportOptionsContainerBox>
                <DialogImportOptionBox>
                    <Typography variant="body2">Include Transfers</Typography>
                    <Checkbox
                        checked={shouldDetectTransfers}
                        onChange={handleCheckboxChange(setShouldDetectTransfers)}
                        size="small"
                        color="primary"
                    />
                </DialogImportOptionBox>
                <DialogImportOptionBox>
                    <Typography variant="body2">Run Import Rules</Typography>
                    <Checkbox
                        checked={shouldRunRules}
                        onChange={handleCheckboxChange(setShouldRunRules)}
                        size="small"
                        color="primary"
                    />
                </DialogImportOptionBox>
                <DialogImportOptionBox>
                    <Typography variant="body2">Reverse Transaction Order</Typography>
                    <Checkbox checked={reversed} onChange={toggleReverseOrder} size="small" color="primary" />
                </DialogImportOptionBox>
            </DialogImportOptionsContainerBox>
            <DialogImportActionsBox>
                <Button color="error" variant="outlined" size="small" onClick={goBackToStatementMapping}>
                    Back
                </Button>
                <Tooltip title={canImportStatementsAndClearDialog() || ""}>
                    <div>
                        <Button
                            variant="contained"
                            size="small"
                            onClick={() => importStatementsAndClearDialog(shouldRunRules, shouldDetectTransfers)}
                            disabled={canImportStatementsAndClearDialog() !== null}
                        >
                            Import Files
                        </Button>
                    </div>
                </Tooltip>
            </DialogImportActionsBox>
        </StepContent>
    );
};

const toggleReverseOrder = handleCheckboxChange((reverse) => {
    const current = TopHatStore.getState().app.dialog.import as DialogStatementImportState;
    TopHatDispatch(
        AppSlice.actions.setDialogPartial({
            id: "import",
            import: {
                ...current,
                reverse,
            },
        })
    );
});
