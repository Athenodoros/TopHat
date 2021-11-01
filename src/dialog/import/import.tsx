import styled from "@emotion/styled";
import { FormControlLabel, Step, StepLabel, Stepper, Switch } from "@mui/material";
import { useEffect, useState } from "react";
import { handleCheckboxChange } from "../../shared/events";
import { DialogStatementImportState } from "../../state/app/statementTypes";
import { Greys } from "../../styles/colours";
import { DialogContents, DialogMain, DialogOptions } from "../shared";
import { DialogImportAccountSelector } from "./account";
import { ImportDialogFileDisplay } from "./contents/file";
import { useNonFileDialogStatementState } from "./contents/shared";
import { FileImportTableView } from "./contents/table";
import { ImportDialogFileTabs } from "./contents/tabs";
import { DialogImportImportStepContent } from "./steps/final";
import { DialogImportMappingStepContent } from "./steps/mapping";
import { DialogImportParseStepContent } from "./steps/parse";

const ScreenIDs = ["parse", "mapping", "import"] as const;
export const DialogImportScreen: React.FC = () => {
    const state = useNonFileDialogStatementState();

    const currentFileParsed = state.columns.all[state.file].matches;
    const [showParsed, setShowParsed] = useState(currentFileParsed);
    useEffect(
        () => {
            if (!currentFileParsed) setShowParsed(false);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [state.file]
    );

    const [shouldDetectTransfers, setShouldDetectTransfers] = useState(true);

    return (
        <DialogMain>
            <DialogOptions>
                <DialogImportAccountSelector />
                <ProgressStepper activeStep={ScreenIDs.indexOf(state.page)} orientation="vertical">
                    <Step>
                        <StepLabel>File Parsing</StepLabel>
                        {state.page === "parse" ? <DialogImportParseStepContent state={state} /> : undefined}
                    </Step>
                    <Step>
                        <StepLabel>Column Mapping</StepLabel>
                        {state.page === "mapping" ? <DialogImportMappingStepContent state={state} /> : undefined}
                    </Step>
                    <Step>
                        <StepLabel>Exclusions and Transfers</StepLabel>
                        <DialogImportImportStepContent
                            shouldDetectTransfers={shouldDetectTransfers}
                            setShouldDetectTransfers={setShouldDetectTransfers}
                        />
                    </Step>
                </ProgressStepper>
            </DialogOptions>
            <DialogContents>
                {state.files.length > 1 ? <ImportDialogFileTabs /> : undefined}
                {showParsed && state.columns.all[state.file].columns ? (
                    // <FileImportTableView columns={state.columns.all[state.file].columns!} />
                    <FileImportTableView
                        transfers={shouldDetectTransfers}
                        reversed={(state as DialogStatementImportState).reverse}
                    />
                ) : (
                    <ImportDialogFileDisplay contents={state.files.find((file) => file.id === state.file)!.contents} />
                )}
                <ShowParsedFormControl
                    control={
                        <Switch
                            checked={showParsed}
                            onChange={handleCheckboxChange(setShowParsed)}
                            color="primary"
                            disabled={!currentFileParsed}
                        />
                    }
                    label="Show Parsed Transactions"
                    labelPlacement="start"
                />
            </DialogContents>
        </DialogMain>
    );
};

const ProgressStepper = styled(Stepper)({ margin: "20px 0 20px 15px", background: "transparent", overflowY: "auto" });
const ShowParsedFormControl = styled(FormControlLabel)({
    marginTop: "auto",
    marginRight: 20,
    transform: "scale(0.8)",
    transformOrigin: "center right",
    color: Greys[900],
});
