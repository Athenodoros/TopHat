import styled from "@emotion/styled";
import { Button, CircularProgress, TextField, Typography } from "@mui/material";
import { Box } from "@mui/system";
import JSZip from "jszip";
import { toPairs } from "lodash";
import Papa from "papaparse";
import React, { useCallback, useState } from "react";
import { createAndDownloadFile } from "../../shared/data";
import { handleTextFieldChange } from "../../shared/events";
import { TopHatDispatch, TopHatStore } from "../../state";
import { DataSlice, DataState } from "../../state/data";
import { DataKeys } from "../../state/data/types";
import { initialiseDemoData } from "../../state/logic/startup";
import { Greys, WHITE } from "../../styles/colours";
import { EditValueContainer } from "../shared";
import { SettingsDialogContents, SettingsDialogDivider, SettingsDialogPage } from "./shared";

const ActionSx = { textAlign: "center", width: 100, height: 61 } as const;
const ItalicsSx = { fontStyle: "italic", color: Greys[700] } as const;
const InputTextField = styled(TextField)({ margin: "10px 50px 0 50px" });

export const DialogExportContents: React.FC = () => {
    return (
        <SettingsDialogPage title="Export Data to Files">
            <Typography variant="body2">
                All data in TopHat can be exported in standard data formats: after all, it's all your data! Choose
                between the formats below - the buttons will download all data to your computer.
            </Typography>
            <SettingsDialogDivider />
            <SettingsDialogContents>
                <EditValueContainer
                    label={
                        <Button sx={ActionSx} variant="outlined" onClick={createCSVDownload}>
                            Export CSV
                        </Button>
                    }
                >
                    <Typography variant="body2" sx={ItalicsSx}>
                        Good for Excel analysis or uploads to other personal finance applications.
                    </Typography>
                </EditValueContainer>
                <EditValueContainer
                    label={
                        <Button sx={ActionSx} variant="outlined" onClick={createJSONDownload}>
                            Export JSON
                        </Button>
                    }
                >
                    <Typography variant="body2" sx={ItalicsSx}>
                        Used to restore information to TopHat, or for analytical and programming tools.
                    </Typography>
                </EditValueContainer>
            </SettingsDialogContents>
        </SettingsDialogPage>
    );
};

const createJSONDownload = () => createAndDownloadFile("TopHat Data.json", JSON.stringify(TopHatStore.getState().data));
const createCSVDownload = () => {
    const state = TopHatStore.getState().data;

    const zip = new JSZip();
    DataKeys.forEach((key) => {
        zip.file(
            `${key}.csv`,
            key === "user"
                ? Papa.unparse(toPairs(state[key]))
                : Papa.unparse(state[key].ids.map((id) => state[key].entities[id]!))
        );
    });

    zip.generateAsync({ type: "blob" }).then((blob) => createAndDownloadFile("TopHat Data.zip", blob));
};

export const DialogImportContents: React.FC = () => {
    const [text, setText] = useState("");
    const ButtonProps = {
        variant: "outlined",
        color: "error",
        sx: ActionSx,
        disabled: text.toUpperCase() !== "PERMANENTLY DELETE ALL DATA",
    } as const;

    const [demoLoading, setDemoLoading] = useState(false);
    const handleDemoRestart = useCallback(() => {
        setDemoLoading(true);
        setTimeout(
            () =>
                initialiseDemoData().then(() => {
                    setDemoLoading(false);
                }),
            0
        );
    }, [setDemoLoading]);

    return (
        <SettingsDialogPage title="Data Import and Deletion">
            <Typography variant="body2">
                These actions will <strong>permanently</strong> remove all data stored in TopHat. To enable them, type
                "PERMANENTLY DELETE ALL DATA" in the box:
            </Typography>
            <InputTextField
                color="error"
                size="small"
                placeholder="Warning: Dangerous!"
                onChange={handleTextFieldChange(setText)}
            />
            <SettingsDialogDivider />
            <SettingsDialogContents>
                <EditValueContainer
                    label={
                        <Button {...ButtonProps} component="label">
                            Import JSON
                            <input hidden={true} type="file" ref={onCreateFileInput} />
                        </Button>
                    }
                >
                    <Typography variant="body2" sx={ItalicsSx}>
                        <strong>Import</strong> - Upload a JSON export of a TopHat state to recreate it.
                    </Typography>
                </EditValueContainer>
                <EditValueContainer
                    label={
                        <Button
                            {...ButtonProps}
                            onClick={handleDemoRestart}
                            variant={demoLoading ? "contained" : "outlined"}
                        >
                            {demoLoading ? (
                                <Box sx={{ transform: "scale(0.3)", transformOrigin: "center" }}>
                                    <CircularProgress size="small" sx={{ color: WHITE }} />
                                </Box>
                            ) : (
                                "Restart Demo"
                            )}
                        </Button>
                    }
                >
                    <Typography variant="body2" sx={ItalicsSx}>
                        <strong>Restart Demo</strong> - Wipe all data stored in TopHat and restart with example data.
                    </Typography>
                </EditValueContainer>
                <EditValueContainer
                    label={
                        <Button {...ButtonProps} onClick={deleteAllData}>
                            Wipe Data
                        </Button>
                    }
                >
                    <Typography variant="body2" sx={ItalicsSx}>
                        <strong>Delete all Data</strong> - Wipe all data stored in TopHat and restart with an empty
                        state.
                    </Typography>
                </EditValueContainer>
            </SettingsDialogContents>
        </SettingsDialogPage>
    );
};

const deleteAllData = () => TopHatDispatch(DataSlice.actions.reset());
const onCreateFileInput = (input: HTMLInputElement) => {
    if (!input) return;

    input.onchange = () => {
        const files = input.files;
        if (!files) return;

        const reader = new FileReader();
        reader.onload = function () {
            const data = JSON.parse(reader.result as string) as DataState;
            TopHatDispatch(DataSlice.actions.set(data));
        };
        reader.readAsText(files[0]);
    };
};
