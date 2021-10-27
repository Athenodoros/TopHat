import { Help } from "@mui/icons-material";
import { Button, Checkbox, IconButton, StepContent, Tooltip, Typography } from "@mui/material";
import { handleTextFieldChange } from "../../../shared/events";
import { DialogStatementParseState } from "../../../state/app/statementTypes";
import {
    canGoToStatementMappingScreen,
    changeStatementParsing,
    goToStatementMappingScreen,
    removeAllStatementFiles,
    toggleStatementHasHeader,
} from "../../../state/logic/statement";
import { Greys } from "../../../styles/colours";
import {
    DialogImportActionsBox,
    DialogImportInputTextField,
    DialogImportOptionBox,
    DialogImportOptionsContainerBox,
    DialogImportOptionTitleContainerBox,
} from "./shared";

export const DialogImportParseStepContent: React.FC<{ state: DialogStatementParseState }> = ({ state }) => (
    <StepContent>
        <DialogImportOptionsContainerBox>
            <DialogImportOptionBox>
                <Typography variant="body2">Header Row</Typography>
                <Checkbox
                    checked={state.parse.header}
                    onClick={toggleStatementHasHeader}
                    size="small"
                    color="primary"
                />
            </DialogImportOptionBox>
            <DialogImportOptionBox>
                <Typography variant="body2">Delimiter</Typography>
                <DialogImportInputTextField
                    variant="standard"
                    placeholder=","
                    size="small"
                    value={state.parse.delimiter || ""}
                    onChange={changeDelimiter}
                />
            </DialogImportOptionBox>
            <DialogImportOptionBox>
                <DialogImportOptionTitleContainerBox>
                    <Typography variant="body2">Date Format</Typography>
                    <Tooltip title="See format strings">
                        <IconButton
                            size="small"
                            href="https://github.com/moment/luxon/blob/master/docs/parsing.md#table-of-tokens"
                            target="_blank"
                        >
                            <Help fontSize="small" htmlColor={Greys[500]} />
                        </IconButton>
                    </Tooltip>
                </DialogImportOptionTitleContainerBox>
                <DialogImportInputTextField
                    variant="standard"
                    placeholder="YYYY-MM-DD"
                    size="small"
                    value={state.parse.dateFormat || ""}
                    onChange={changeDateFormat}
                />
            </DialogImportOptionBox>
        </DialogImportOptionsContainerBox>
        <DialogImportActionsBox>
            <Button color="error" variant="outlined" size="small" onClick={removeAllStatementFiles}>
                Back
            </Button>
            <Tooltip title={canGoToStatementMappingScreen(state) || ""}>
                <div>
                    <Button
                        variant="contained"
                        size="small"
                        disabled={canGoToStatementMappingScreen(state) !== null}
                        onClick={goToStatementMappingScreen}
                    >
                        Map Columns
                    </Button>
                </div>
            </Tooltip>
        </DialogImportActionsBox>
    </StepContent>
);

const changeDelimiter = handleTextFieldChange((value) => changeStatementParsing({ delimiter: value || undefined }));
const changeDateFormat = handleTextFieldChange((value) => changeStatementParsing({ dateFormat: value || undefined }));
