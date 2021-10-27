import styled from "@emotion/styled";
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
import {
    Divider,
    IconButton,
    ListItemIcon,
    ListItemText,
    MenuItem,
    outlinedInputClasses,
    Select,
    selectClasses,
} from "@mui/material";
import { Box } from "@mui/system";
import { handleSelectChange } from "../shared/events";
import { IconType } from "../shared/types";
import { TopHatDispatch } from "../state";
import { AppSlice, DialogState } from "../state/app";
import { useDialogPage } from "../state/app/hooks";
import { DIALOG_OPTIONS_WIDTH } from "./shared";

export const DialogHeader: React.FC = () => {
    const state = useDialogPage();

    return (
        <HeaderBox>
            <Select
                value={state !== "closed" ? state : "settings"}
                onChange={changeDialogScreen}
                size="small"
                // MenuProps={{ className: classes.menu }}
            >
                {MenuItems}
            </Select>
            <IconButton onClick={closeDialogBox} size="large">
                <Clear fontSize="small" sx={{ minWidth: 40 }} />
            </IconButton>
        </HeaderBox>
    );
};

export const closeDialogBox = () => TopHatDispatch(AppSlice.actions.setDialogPage("closed"));
const changeDialogScreen = handleSelectChange((id: DialogState["id"]) => {
    TopHatDispatch(AppSlice.actions.setDialogPage(id));
    setTimeout(() => (document.activeElement as HTMLElement | undefined)?.blur());
});

const ExpandedListItemText = styled(ListItemText)({ marginTop: "4px !important", marginBottom: "4px !important" });
const getMenuItem = (Icon: IconType, name: string, display: string) => (
    <MenuItem value={name} key={name}>
        <ListItemIcon>
            <Icon fontSize="small" />
        </ListItemIcon>
        <ExpandedListItemText>{display}</ExpandedListItemText>
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

const HeaderBox = styled(Box)({
    height: 60,
    padding: "3px 8px 3px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,

    [`& .${outlinedInputClasses.root}:not(:hover):not(:focus-within) .${outlinedInputClasses.notchedOutline}`]: {
        border: "none",
    },

    [`& .${selectClasses.select}`]: {
        width: DIALOG_OPTIONS_WIDTH - 32 - 18 - 20 * 2,
        display: "flex",
        alignItems: "center",
        padding: "5px 32px 5px 18px",
    },
});
