import { Button, TextField, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import JSZip from "jszip";
import { toPairs } from "lodash";
import Papa from "papaparse";
import React, { useState } from "react";
import { createAndDownloadFile } from "../../shared/data";
import { handleTextFieldChange } from "../../shared/events";
import { TopHatDispatch, TopHatStore } from "../../state";
import { DataSlice, DataState } from "../../state/data";
import { DataKeys } from "../../state/logic/startup";
import { EditValueContainer } from "../shared";
import { SettingsDialogDivider, SettingsDialogPage } from "./shared";

const useStyles = makeStyles({
    input: {
        margin: "10px 50px 0 50px",
    },
    button: {
        textAlign: "center",
        width: 100,
    },
});

export const DialogExportContents: React.FC = () => {
    const classes = useStyles();

    // TODO: This
    return (
        <SettingsDialogPage title="Export Data to Files">
            <Typography variant="body2">
                All data in TopHat can be exported in standard data formats: after all, it's all your data! Choose
                between the formats below - the buttons will download all data to your computer.
            </Typography>
            <SettingsDialogDivider />
            <EditValueContainer
                label={
                    <Button variant="outlined" className={classes.button} onClick={createCSVDownload}>
                        Export CSV
                    </Button>
                }
            >
                <Typography variant="body1">
                    Good for Excel analysis or uploads to other personal finance applications.
                </Typography>
            </EditValueContainer>
            <EditValueContainer
                label={
                    <Button variant="outlined" className={classes.button} onClick={createJSONDownload}>
                        Export JSON
                    </Button>
                }
            >
                <Typography variant="body1">
                    Used to restore information to TopHat, or for analytical and programming tools.
                </Typography>
            </EditValueContainer>
        </SettingsDialogPage>
    );
};

const createJSONDownload = () => createAndDownloadFile("TopHat Data.json", JSON.stringify(TopHatStore.getState()));
const createCSVDownload = () => {
    const state = TopHatStore.getState().data;

    const zip = new JSZip();
    DataKeys.forEach((key) => {
        zip.file(
            `${key}.csv`,
            Papa.unparse(key === "user" ? toPairs(state[key]) : state[key].ids.map((id) => state[key].entities[id]!))
        );
    });

    zip.generateAsync({ type: "blob" }).then((blob) => createAndDownloadFile("TopHat Data.zip", blob));
};

export const DialogImportContents: React.FC = () => {
    const classes = useStyles();

    const [text, setText] = useState("");
    const ButtonProps = {
        variant: "outlined",
        color: "error",
        className: classes.button,
        disabled: text.toUpperCase() !== "PERMANENTLY DELETE ALL DATA",
    } as const;

    return (
        <SettingsDialogPage title="Data Import and Deletion">
            <Typography variant="body2">
                These actions will <strong>permanently</strong> remove all data stored in TopHat. To enable them, type
                "PERMANENTLY DELETE ALL DATA" in the box:
            </Typography>
            <TextField
                color="error"
                size="small"
                placeholder="Warning: Dangerous!"
                className={classes.input}
                onChange={handleTextFieldChange(setText)}
            />
            <SettingsDialogDivider />
            <EditValueContainer
                label={
                    <Button {...ButtonProps} component="label">
                        Import JSON
                        <input hidden={true} type="file" ref={onCreateFileInput} />
                    </Button>
                }
            >
                <Typography variant="body1">
                    <strong>Import</strong> - Upload a JSON export of a TopHat state to recreate it.
                </Typography>
            </EditValueContainer>
            <EditValueContainer
                label={
                    <Button {...ButtonProps} onClick={resetDemoData}>
                        Restart Demo
                    </Button>
                }
            >
                <Typography variant="body1">
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
                <Typography variant="body1">
                    <strong>Delete all Data</strong> - Wipe all data stored in TopHat and restart with an empty state.
                </Typography>
            </EditValueContainer>
        </SettingsDialogPage>
    );
};

const deleteAllData = () => TopHatDispatch(DataSlice.actions.reset());
const resetDemoData = () => TopHatDispatch(DataSlice.actions.setUpDemo());
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
