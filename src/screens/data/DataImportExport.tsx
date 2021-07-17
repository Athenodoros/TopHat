import { Button, makeStyles, TextField, Typography } from "@material-ui/core";
import React, { useState } from "react";
import { Section } from "../../components/layout";
import { TopHatDispatch } from "../../state";
import { DataSlice, DataState } from "../../state/data";
import { useSelector } from "../../state/utilities/hooks";
import { Greys } from "../../styles/colours";
import { onTextFieldChange } from "../../utilities/events";

const useStyles = makeStyles({
    container: {
        display: "flex",
        flexDirection: "column",
    },
    input: {
        margin: "25px 40px 0 40px",
    },
    divider: {
        background: Greys[300],
        height: 1,
        width: "60%",
        margin: "30px auto",
    },
    button: {
        alignSelf: "flex-end",
        marginBottom: 40,

        "&:last-child": {
            marginBottom: 10,
        },
    },
});
export const DataExports: React.FC = () => {
    const classes = useStyles();
    const data = useSelector((state) => state.data);

    const createJSONDownload = () => {
        const blob = new Blob([JSON.stringify(data)], { type: "text/plain" });

        const link = document.createElement("a");
        link.download = "TopHat Data.json";
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
    };

    // TODO: This
    return (
        <Section title="Export">
            <div className={classes.container}>
                <Typography variant="body1">
                    All data in TopHat can be exported in standard data formats: after all, it's all your data! Click
                    one of the formats below.
                </Typography>
                <div className={classes.divider} />
                <Typography variant="body1">
                    <strong>CSV</strong> - Good for Excel analysis or uploads to other personal finance applications.
                    Exports as a ZIP file of CSVs.
                </Typography>
                <Button variant="outlined" className={classes.button} color="primary" disabled={true}>
                    Export CSV
                </Button>
                <Typography variant="body1">
                    <strong>JSON</strong> - Useful to restore information to TopHat, or for usage in some analytical
                    tools and programming languages.
                </Typography>
                <Button variant="outlined" className={classes.button} color="primary" onClick={createJSONDownload}>
                    Export JSON
                </Button>
            </div>
        </Section>
    );
};

// const downloadDataJSON = () =>

export const DataImports: React.FC = () => {
    const classes = useStyles();
    const [text, setText] = useState("");
    const ButtonProps = {
        variant: "outlined",
        className: classes.button,
        color: "secondary",
        disabled: text.toUpperCase() !== "PERMANENTLY DELETE ALL DATA",
    } as const;

    // TODO: This
    return (
        <Section title="Export">
            <div className={classes.container}>
                <Typography variant="body1">
                    These actions will <strong>permanently</strong> remove all data stored in TopHat. To enable them,
                    type "PERMANENTLY DELETE ALL DATA" in the box below:
                </Typography>
                <TextField
                    variant="outlined"
                    color="secondary"
                    size="small"
                    placeholder="Warning: Dangerous!"
                    className={classes.input}
                    onChange={onTextFieldChange(setText)}
                />
                <div className={classes.divider} />
                <Typography variant="body1">
                    <strong>Import</strong> - Upload a JSON export of a TopHat state to recreate it.
                </Typography>
                <Button {...ButtonProps} component="label">
                    Import JSON
                    <input hidden={true} type="file" ref={onCreateFileInput} />
                </Button>
                <Typography variant="body1">
                    <strong>Restart Demo</strong> - Wipe all data stored in TopHat and restart with example data.
                </Typography>
                <Button {...ButtonProps} onClick={resetDemoData}>
                    Restart Demo
                </Button>
                <Typography variant="body1">
                    <strong>Delete all Data</strong> - Wipe all data stored in TopHat and restart with an empty state.
                </Typography>
                <Button {...ButtonProps} onClick={deleteAllData}>
                    Wipe Data
                </Button>
            </div>
        </Section>
    );
};

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

const deleteAllData = () => TopHatDispatch(DataSlice.actions.reset());
const resetDemoData = () => TopHatDispatch(DataSlice.actions.setUpDemo());
