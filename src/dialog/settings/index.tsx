import { Cached, CloudDone, Edit, GetApp, ListAlt, Notifications } from "@mui/icons-material";
import { List, ListItemIcon, ListItemText, ListSubheader, MenuItem } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import React from "react";
import { zipObject } from "../../shared/data";
import { withSuppressEvent } from "../../shared/events";
import { TopHatDispatch } from "../../state";
import { AppSlice, DialogState } from "../../state/app";
import { useDialogState } from "../../state/app/hooks";
import { StubUserID } from "../../state/data/types";
import { useSelector } from "../../state/shared/hooks";
import { Greys } from "../../styles/colours";
import { DialogContents, DialogMain, DialogOptions } from "../shared";
import { DialogCurrencyContents } from "./currency";
import { DialogExportContents, DialogImportContents } from "./data";
import { DialogNotificationsContents } from "./notifications";
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
    const isDemo = useSelector((state) => state.data.user.entities[StubUserID]!.isDemo);

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
                    <MenuItem onClick={setPage["notifications"]} selected={page === "notifications"}>
                        <ListItemIcon>
                            <Notifications fontSize="small" />
                        </ListItemIcon>
                        <ListItemText className={classes.text}>Notifications</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={setPage["currency"]} selected={page === "currency"}>
                        <ListItemIcon>
                            <Cached fontSize="small" />
                        </ListItemIcon>
                        <ListItemText className={classes.text}>Currency Sync</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={setPage["storage"]} selected={page === "storage"}>
                        <ListItemIcon>
                            <CloudDone fontSize="small" />
                        </ListItemIcon>
                        <ListItemText className={classes.text}>Storage and Services</ListItemText>
                    </MenuItem>
                </List>
            </DialogOptions>
            <DialogContents>{page ? Pages[page] : <DialogSummaryContents />}</DialogContents>
        </DialogMain>
    );
};

const pages = ["import", "export", "storage", "notifications", "currency"] as const;
const setPage = zipObject(
    pages,
    pages.map((settings) => withSuppressEvent(() => TopHatDispatch(AppSlice.actions.setDialogPartial({ settings }))))
);
const setEmptyPage = () => TopHatDispatch(AppSlice.actions.setDialogPartial({ settings: undefined }));

const Pages: Record<NonNullable<DialogState["settings"]>, React.ReactNode> = {
    import: <DialogImportContents />,
    export: <DialogExportContents />,
    storage: null,
    notifications: <DialogNotificationsContents />,
    currency: <DialogCurrencyContents />,
};
