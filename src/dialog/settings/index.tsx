import styled from "@emotion/styled";
import { Cached, CloudDone, Edit, GetApp, ListAlt, Notifications } from "@mui/icons-material";
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
import { DialogCurrencyContents } from "./currency";
import { DialogExportContents, DialogImportContents } from "./data";
import { DialogNotificationsContents } from "./notifications";
import { DialogStorageContents } from "./storage";
import { DialogSummaryContents } from "./summary";

export const DialogSettingsView: React.FC = () => {
    const page = useDialogState("settings");
    const isDemo = useUserData((user) => user.isDemo);

    return (
        <DialogMain>
            <DialogOptions>
                <SettingsList>
                    <SettingsSubheader>Data</SettingsSubheader>
                    <MenuItem onClick={setEmptyPage} selected={page === undefined}>
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
    storage: <DialogStorageContents />,
    notifications: <DialogNotificationsContents />,
    currency: <DialogCurrencyContents />,
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
