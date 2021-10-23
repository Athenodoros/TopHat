import {
    AccountBalance,
    AccountBalanceWallet,
    CallSplit,
    Clear,
    Description,
    Euro,
    NoteAdd,
    Settings,
    ShoppingBasket,
} from "@mui/icons-material";
import { Dialog, Divider, IconButton, ListItemIcon, ListItemText, MenuItem, Select } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { get } from "lodash";
import { useCallback, useContext, useEffect, useState } from "react";
import { FileHandlerContext } from "../app/context";
import { handleSelectChange } from "../shared/events";
import { IconType } from "../shared/types";
import { TopHatDispatch } from "../state";
import { AppSlice, DialogState } from "../state/app";
import { useDialogPage } from "../state/app/hooks";
import { DialogImportView } from "./import";
import { DialogAccountsView } from "./pages/accounts";
import { DialogCategoriesView } from "./pages/categories";
import { DialogCurrenciesView } from "./pages/currencies";
import { DialogInstitutionsView } from "./pages/institutions";
import { DialogRulesView } from "./pages/rules";
import { DialogStatementView } from "./pages/statements";
import { DialogSettingsView } from "./settings";
import { DialogMain, DIALOG_OPTIONS_WIDTH } from "./shared";

const useStyles = makeStyles({
    paper: {
        width: 900,
        maxWidth: "inherit",
        height: 600,
        overflow: "hidden",
    },
    header: {
        height: 60,
        padding: "3px 8px 3px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,

        "& .MuiOutlinedInput-root:not(:hover):not(:focus-within) .MuiOutlinedInput-notchedOutline": {
            border: "none",
        },

        "& .MuiSelect-select": {
            width: DIALOG_OPTIONS_WIDTH - 32 - 18 - 20 * 2,
            display: "flex",
            alignItems: "center",
            padding: "5px 32px 5px 18px",

            "& > .MuiListItemIcon-root": {
                minWidth: 40,
            },
        },
    },
    menu: {
        "& .MuiListItemText-root": {
            marginTop: 4,
            marginBottom: 4,
        },
    },
});

export const TopHatDialog: React.FC = () => {
    const state = useDialogPage();
    const { dropzoneRef, isDragActive } = useContext(FileHandlerContext);
    const classes = useStyles();

    const onClose = useCallback(() => !isDragActive && closeDialog(), [isDragActive]);

    // This triggers a re-render after initial load, once the ref is populated
    const reRender = useState(false)[1];
    useEffect(() => void setTimeout(() => reRender(true), 0.1), [reRender]);

    if (!dropzoneRef?.current) return null;

    return (
        <Dialog
            open={state !== "closed" || isDragActive}
            onClose={onClose}
            PaperProps={{ className: classes.paper }}
            disablePortal={true} // This enables file dragover to still hit the dropzone with a full-page dialog
        >
            <div className={classes.header}>
                <Select
                    value={state !== "closed" ? state : "settings"}
                    onChange={changeDialogScreen}
                    size="small"
                    MenuProps={{ className: classes.menu }}
                >
                    {MenuItems}
                </Select>
                <IconButton onClick={closeDialog} size="large">
                    <Clear fontSize="small" />
                </IconButton>
            </div>
            {isDragActive ? DialogPages.import : get(DialogPages, state, <DialogMain />)}
        </Dialog>
    );
};

const closeDialog = () => TopHatDispatch(AppSlice.actions.setDialogPage("closed"));
const changeDialogScreen = handleSelectChange((id: DialogState["id"]) => {
    TopHatDispatch(AppSlice.actions.setDialogPage(id));
    setTimeout(() => (document.activeElement as HTMLElement | undefined)?.blur());
});

const getMenuItem = (Icon: IconType, name: string, display: string) => (
    <MenuItem value={name} key={name}>
        <ListItemIcon>
            <Icon fontSize="small" />
        </ListItemIcon>
        <ListItemText>{display}</ListItemText>
    </MenuItem>
);
const MenuItems = [
    getMenuItem(AccountBalanceWallet, "account", "Accounts"),
    getMenuItem(AccountBalance, "institution", "Institutions"),
    getMenuItem(ShoppingBasket, "category", "Categories"),
    getMenuItem(Euro, "currency", "Currencies"),
    <Divider key={1} />,
    getMenuItem(Description, "statement", "Statements"),
    getMenuItem(NoteAdd, "import", "Statement Import"),
    getMenuItem(CallSplit, "rule", "Rules"),
    <Divider key={2} />,
    getMenuItem(Settings, "settings", "Settings"),
];

const DialogPages = {
    account: <DialogAccountsView />,
    institution: <DialogInstitutionsView />,
    category: <DialogCategoriesView />,
    currency: <DialogCurrenciesView />,
    rule: <DialogRulesView />,
    statement: <DialogStatementView />,
    import: <DialogImportView />,
    settings: <DialogSettingsView />,
} as const;
