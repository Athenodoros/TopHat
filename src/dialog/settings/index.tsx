import styled from "@emotion/styled";
import {
    Cached,
    CloudDone,
    Edit,
    GetApp,
    ListAlt,
    ManageHistory,
    Notifications,
    PestControl,
} from "@mui/icons-material";
import { List, ListItemIcon, ListItemText, ListSubheader, MenuItem } from "@mui/material";
import React from "react";
import { zipObject } from "../../shared/data";
import { withSuppressEvent } from "../../shared/events";
import { TopHatDispatch } from "../../state";
import { AppSlice, DialogState } from "../../state/app";
import { useDialogState } from "../../state/app/hooks";
import { useUserData } from "../../state/data/hooks";
import { Greys } from "../../styles/colours";
import { DialogContents, DialogMain, DialogOptions } from "../shared";
import { DialogAboutContents } from "./about";
import { DialogCurrencyContents } from "./currency";
import { DialogExportContents, DialogImportContents } from "./data";
import { DialogDebugContents } from "./debug";
import { DialogHistoryContents } from "./history";
import { DialogNotificationsContents } from "./notifications";
import { DialogStorageContents } from "./storage";
import { DialogSummaryContents } from "./summary";

export const DialogSettingsView: React.FC = () => {
    const page = useDialogState("settings");
    const isDemo = useUserData((user) => user.isDemo);

    return (
        <DialogMain onClick={setEmptyPage}>
            <DialogOptions>
                <SettingsList>
                    <SettingsSubheader>Data</SettingsSubheader>
                    <MenuItem onClick={setPage["summary"]} selected={page === "summary"}>
                        <ListItemIcon>
                            <ListAlt fontSize="small" />
                        </ListItemIcon>
                        <SettingsListItemText>{isDemo ? "Demo" : "Summary"}</SettingsListItemText>
                    </MenuItem>
                    <MenuItem onClick={setPage["import"]} selected={page === "import"}>
                        <ListItemIcon>
                            <Edit fontSize="small" />
                        </ListItemIcon>
                        <SettingsListItemText>Manage Data</SettingsListItemText>
                    </MenuItem>
                    <MenuItem onClick={setPage["export"]} selected={page === "export"}>
                        <ListItemIcon>
                            <GetApp fontSize="small" />
                        </ListItemIcon>
                        <SettingsListItemText>Export</SettingsListItemText>
                    </MenuItem>
                    <MenuItem onClick={setPage["debug"]} selected={page === "debug"}>
                        <ListItemIcon>
                            <PestControl fontSize="small" />
                        </ListItemIcon>
                        <SettingsListItemText>Debug</SettingsListItemText>
                    </MenuItem>
                    <MenuItem onClick={setPage["history"]} selected={page === "history"}>
                        <ListItemIcon>
                            <ManageHistory fontSize="small" />
                        </ListItemIcon>
                        <SettingsListItemText>History</SettingsListItemText>
                    </MenuItem>
                    <SettingsSubheader>Settings</SettingsSubheader>
                    <MenuItem onClick={setPage["notifications"]} selected={page === "notifications"}>
                        <ListItemIcon>
                            <Notifications fontSize="small" />
                        </ListItemIcon>
                        <SettingsListItemText>Notifications</SettingsListItemText>
                    </MenuItem>
                    <MenuItem onClick={setPage["currency"]} selected={page === "currency"}>
                        <ListItemIcon>
                            <Cached fontSize="small" />
                        </ListItemIcon>
                        <SettingsListItemText>Currency Sync</SettingsListItemText>
                    </MenuItem>
                    <MenuItem onClick={setPage["storage"]} selected={page === "storage"}>
                        <ListItemIcon>
                            <CloudDone fontSize="small" />
                        </ListItemIcon>
                        <SettingsListItemText>Storage and Services</SettingsListItemText>
                    </MenuItem>
                </SettingsList>
            </DialogOptions>
            <DialogContents>{page ? Pages[page] : <DialogAboutContents />}</DialogContents>
        </DialogMain>
    );
};

const pages = ["summary", "import", "export", "debug", "storage", "notifications", "currency", "history"] as const;
const setPage = zipObject(
    pages,
    pages.map((settings) => withSuppressEvent(() => TopHatDispatch(AppSlice.actions.setDialogPartial({ settings }))))
);
const setEmptyPage = () => TopHatDispatch(AppSlice.actions.setDialogPartial({ settings: undefined }));

const Pages: Record<NonNullable<DialogState["settings"]>, React.ReactNode> = {
    summary: <DialogSummaryContents />,
    import: <DialogImportContents />,
    export: <DialogExportContents />,
    debug: <DialogDebugContents />,
    storage: <DialogStorageContents />,
    notifications: <DialogNotificationsContents />,
    currency: <DialogCurrencyContents />,
    history: <DialogHistoryContents />,
};

const SettingsList = styled(List)({
    overflowY: "scroll",
    paddingTop: 0,
    paddingBottom: 0,
    margin: "8px 0",
    "& > li": {
        paddingLeft: 20,
        paddingRight: 20,
    },
});
const SettingsSubheader = styled(ListSubheader)({ background: Greys[200] });
const SettingsListItemText = styled(ListItemText)({ paddingTop: 4, paddingBottom: 4 });
