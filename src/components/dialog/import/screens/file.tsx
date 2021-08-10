import { Button, Link, makeStyles, Typography } from "@material-ui/core";
import { NoteAdd } from "@material-ui/icons";
import clsx from "clsx";
import React, { useContext } from "react";
import { TopHatDispatch } from "../../../../state";
import { AppSlice, DefaultPages } from "../../../../state/app";
import { useDialogState } from "../../../../state/app/hooks";
import { DialogStatementFileState } from "../../../../state/app/statementTypes";
import { Greys, Intents } from "../../../../styles/colours";
import { FileHandlerContext } from "../../../shell/workspace";
import { DialogContents, DialogMain, DialogOptions } from "../../utilities";
import { DialogImportAccountSelector, DialogImportTitle } from "../utilities";

const useStyles = makeStyles((theme) => ({
    body: {
        margin: "6px 30px",
    },
    upload: {
        margin: "auto 20px 12px 20px",
    },
    icon: {
        margin: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",

        transition: theme.transitions.create(["transform", "color"]),
        transformOrigin: "center center",
        color: Greys[500],

        "& > svg": {
            height: 80,
            width: 80,
            padding: 20,
            borderRadius: "50%",
            color: "inherit",
            background: Greys[300],
            marginBottom: 15,
        },
    },
    active: {
        transform: "scale(1.05)",
        color: Intents.primary.main,
    },
}));
export const DialogImportFileScreen: React.FC = () => {
    const classes = useStyles();
    const { openFileDialog, isDragActive } = useContext(FileHandlerContext);
    const rejections = useDialogState("import", (state) => (state as DialogStatementFileState).rejections);

    return (
        <DialogMain>
            <DialogOptions>
                <DialogImportAccountSelector />
                <DialogImportTitle title="File Upload" />
                <Typography variant="body2" className={classes.body}>
                    Drag and Drop statements, or upload using the button below, from the same account.
                </Typography>
                <Typography variant="body2" className={classes.body}>
                    Alternatively, manually create transactions from{" "}
                    <Link onClick={goToTransactionsPage} href="#">
                        the Transactions page
                    </Link>
                    .
                </Typography>
                <Button variant="outlined" color="primary" onClick={openFileDialog} className={classes.upload}>
                    Upload File
                </Button>
            </DialogOptions>
            <DialogContents>
                <div className={clsx(classes.icon, isDragActive && classes.active)}>
                    <NoteAdd />
                    <Typography variant="h6">Add Statements</Typography>
                    <Typography variant="body1" style={{ color: Intents.danger.main }}>
                        {rejections.join(", ")}
                    </Typography>
                </div>
            </DialogContents>
        </DialogMain>
    );
};

const goToTransactionsPage = () => TopHatDispatch(AppSlice.actions.closeDialogAndGoToPage(DefaultPages.transactions));
