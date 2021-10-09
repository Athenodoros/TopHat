import { CloudDone, Edit, GetApp, ListAlt } from "@mui/icons-material";
import { List, ListItemIcon, ListItemText, ListSubheader, MenuItem } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { get } from "lodash";
import React from "react";
import { zipObject } from "../../shared/data";
import { withSuppressEvent } from "../../shared/events";
import { TopHatDispatch } from "../../state";
import { AppSlice } from "../../state/app";
import { useDialogState } from "../../state/app/hooks";
import { useSelector } from "../../state/shared/hooks";
import { Greys } from "../../styles/colours";
import { DialogContents, DialogMain, DialogOptions } from "../shared";
import { DialogExportContents, DialogImportContents } from "./data";
import { DialogSummaryContents } from "./summary";

const useStyles = makeStyles({
    list: {
        "& > li": {
            paddingLeft: 20,
            paddingRight: 20,
        },
    },
    subheader: { background: Greys[200] },
    text: {
        paddingTop: 4,
        paddingBottom: 4,
    },
});
export const DialogSettingsView: React.FC = () => {
    const classes = useStyles();
    const page = useDialogState("settings");
    const isDemo = useSelector((state) => state.data.user.isDemo);

    return (
        <DialogMain>
            <DialogOptions>
                <List className={classes.list}>
                    <ListSubheader className={classes.subheader}>Data</ListSubheader>
                    <MenuItem onClick={setEmptyPage} selected={page === undefined}>
                        <ListItemIcon>
                            <ListAlt fontSize="small" />
                        </ListItemIcon>
                        <ListItemText className={classes.text}>{isDemo ? "Demo" : "Summary"}</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={setPage["import"]} selected={page === "import"}>
                        <ListItemIcon>
                            <Edit fontSize="small" />
                        </ListItemIcon>
                        <ListItemText className={classes.text}>Manage Data</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={setPage["export"]} selected={page === "export"}>
                        <ListItemIcon>
                            <GetApp fontSize="small" />
                        </ListItemIcon>
                        <ListItemText className={classes.text}>Export</ListItemText>
                    </MenuItem>
                    <ListSubheader className={classes.subheader}>Settings</ListSubheader>
                    <MenuItem onClick={setPage["storage"]} selected={page === "storage"}>
                        <ListItemIcon>
                            <CloudDone fontSize="small" />
                        </ListItemIcon>
                        <ListItemText className={classes.text}>Storage and Services</ListItemText>
                    </MenuItem>
                </List>
            </DialogOptions>
            <DialogContents>{get(Pages, page || "", <DialogSummaryContents />)}</DialogContents>
        </DialogMain>
    );
};

const pages = ["import", "export", "storage"] as const;
const setPage = zipObject(
    pages,
    pages.map((settings) => withSuppressEvent(() => TopHatDispatch(AppSlice.actions.setDialogPartial({ settings }))))
);
const setEmptyPage = () => TopHatDispatch(AppSlice.actions.setDialogPartial({ settings: undefined }));

const Pages = {
    import: <DialogImportContents />,
    export: <DialogExportContents />,
    storage: null,
};
