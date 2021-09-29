import { Button, TextField, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import React, { useCallback, useState } from "react";
import { createAndDownloadFile } from "../../shared/data";
import { handleTextFieldChange } from "../../shared/events";
import { TopHatDispatch } from "../../state";
import { DataSlice, DataState } from "../../state/data";
import { useSelector } from "../../state/shared/hooks";
import { Greys } from "../../styles/colours";
import { EditValueContainer } from "../shared";

const useStyles = makeStyles({
    container: {
        display: "flex",
        flexDirection: "column",
        width: 450,
        margin: "40px auto",
    },
    input: {
        margin: "10px 50px 30px 50px",
    },
    divider: {
        background: Greys[300],
        height: 1,
        width: "60%",
        margin: "20px auto 20px auto",
    },
    button: {
        textAlign: "center",
        width: 100,
    },
    largeButton: {
        alignSelf: "flex-end",
        marginTop: 10,
        marginBottom: 40,

        "&:last-child": {
            marginBottom: 10,
        },
    },
});

export const DialogExportContents: React.FC = () => {
    const classes = useStyles();

    const data = useSelector((state) => state.data);
    const createJSONDownload = useCallback(
        () => createAndDownloadFile("TopHat Data.json", JSON.stringify(data)),
        [data]
    );

    // TODO: This
    return (
        <div className={classes.container}>
            <Typography variant="body2">
                All data in TopHat can be exported in standard data formats: after all, it's all your data! Choose
                between the formats below - the buttons will download all data to your computer.
            </Typography>
            <div className={classes.divider} />
            <EditValueContainer
                label={
                    <Button variant="outlined" className={classes.largeButton} disabled={true}>
                        Export CSV
                    </Button>
                }
            >
                <Typography variant="body1">
                    Good for Excel analysis or uploads to other personal finance applications. Exports as a ZIP file of
                    CSVs.
                </Typography>
            </EditValueContainer>
            <EditValueContainer
                label={
                    <Button variant="outlined" className={classes.largeButton} onClick={createJSONDownload}>
                        Export JSON
                    </Button>
                }
            >
                <Typography variant="body1">
                    Used to restore information to TopHat, and useful for some analytical tools and programming
                    languages.
                </Typography>
            </EditValueContainer>
        </div>
    );
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

    // TODO: This
    return (
        <div className={classes.container}>
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
        </div>
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
