import { List, ListItemIcon, ListItemText, ListSubheader, makeStyles, MenuItem } from "@material-ui/core";
import { GetApp, ListAlt, SaveAlt, Timeline } from "@material-ui/icons";
import { get } from "lodash";
import React from "react";
import { TopHatDispatch, TopHatStore } from "../../../state";
import { AppSlice } from "../../../state/app";
import { useDialogState } from "../../../state/app/hooks";
import { useSelector } from "../../../state/utilities/hooks";
import { zipObject } from "../../../utilities/data";
import { withSuppressEvent } from "../../../utilities/events";
import { DialogContents, DialogMain, DialogOptions } from "../utilities";
import { DialogExportContents, DialogImportContents } from "./data";
import { DialogSummaryContents } from "./summary";

const useStyles = makeStyles({
    list: {
        "& > li": {
            paddingLeft: 20,
            paddingRight: 20,
        },
    },
});
export const DialogSettingsView: React.FC = () => {
    const classes = useStyles();
    const page = useDialogState("settings");
    console.log(
        page,
        useSelector((state) => state.app.dialog),
        "budgeting"
    );

    return (
        <DialogMain onClick={setEmptyPage}>
            <DialogOptions>
                <List className={classes.list}>
                    <ListSubheader>Data</ListSubheader>
                    <MenuItem onClick={setPage["import"]} selected={page === "import"}>
                        <ListItemIcon>
                            <ListAlt fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Import and Wipe Data</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={setPage["export"]} selected={page === "export"}>
                        <ListItemIcon>
                            <GetApp fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Export Data</ListItemText>
                    </MenuItem>
                    <ListSubheader>Settings</ListSubheader>
                    <MenuItem onClick={setPage["storage"]} selected={page === "storage"}>
                        <ListItemIcon>
                            <SaveAlt fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Storage and Services</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={setPage["budgeting"]} selected={page === "budgeting"}>
                        <ListItemIcon>
                            <Timeline fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Budgeting</ListItemText>
                    </MenuItem>
                </List>
            </DialogOptions>
            <DialogContents>{get(Pages, page || "", <DialogSummaryContents />)}</DialogContents>
        </DialogMain>
    );
};

const pages = ["import", "export", "storage", "budgeting"] as const;
const setPage = zipObject(
    pages,
    pages.map((page) =>
        withSuppressEvent(() =>
            TopHatDispatch(
                AppSlice.actions.setDialogPartial({
                    settings: page === TopHatStore.getState().app.dialog.settings ? undefined : page,
                })
            )
        )
    )
);
const setEmptyPage = () => TopHatDispatch(AppSlice.actions.setDialogPartial({ settings: undefined }));

const Pages = {
    import: <DialogImportContents />,
    export: <DialogExportContents />,
};
