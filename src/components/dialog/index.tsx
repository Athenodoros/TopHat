import {
    Dialog,
    Divider,
    FormControl,
    IconButton,
    ListItemIcon,
    ListItemText,
    makeStyles,
    MenuItem,
    Select,
} from "@material-ui/core";
import {
    AccountBalance,
    AccountBalanceWallet,
    CallSplit,
    Clear,
    Description,
    Euro,
    Settings,
    ShoppingBasket,
} from "@material-ui/icons";
import { get } from "lodash";
import { useCallback, useContext } from "react";
import { TopHatDispatch } from "../../state";
import { AppSlice, DialogState } from "../../state/app";
import { useDialogPage } from "../../state/app/hooks";
import { handleSelectChange } from "../../utilities/events";
import { IconType } from "../../utilities/types";
import { FileHandlerContext } from "../shell/workspace";
import { DialogAccountsView } from "./objects/accounts";
import { DialogInstitutionsView } from "./objects/institution";
import { DialogMain } from "./utilities";

const useStyles = makeStyles((theme) => ({
    paper: {
        width: 900,
        maxWidth: "inherit",
        height: 600,
    },
    header: {
        height: 60,
        padding: "3px 8px 3px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,

        "& .MuiSelect-root": {
            width: 230,
            display: "flex",
            alignItems: "center",
            padding: "5px 32px 5px 18px",

            "& > .MuiListItemIcon-root": {
                minWidth: 40,
            },
        },
    },
}));

export const TopHatDialog: React.FC = () => {
    const state = useDialogPage();
    const { dropzoneRef, isDragActive } = useContext(FileHandlerContext);
    const classes = useStyles();

    const onClose = useCallback(() => !isDragActive && closeDialog(), [isDragActive]);

    if (!dropzoneRef?.current) return null;

    return (
        <Dialog open={state !== "closed" || isDragActive} onClose={onClose} PaperProps={{ className: classes.paper }}>
            <div className={classes.header}>
                <FormControl variant="outlined" size="small">
                    <Select value={state !== "closed" ? state : "settings"} onChange={changeDialogScreen}>
                        {MenuItems}
                    </Select>
                </FormControl>
                <IconButton onClick={closeDialog}>
                    <Clear fontSize="small" />
                </IconButton>
            </div>
            {get(DialogPages, state, <DialogMain />)}
        </Dialog>
    );
};

const closeDialog = () => TopHatDispatch(AppSlice.actions.setDialogPage("closed"));
const changeDialogScreen = handleSelectChange((id: DialogState["id"]) =>
    TopHatDispatch(AppSlice.actions.setDialogPage(id))
);

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
    getMenuItem(CallSplit, "rule", "Rules"),
    <Divider key={2} />,
    getMenuItem(Settings, "settings", "Settings"),
];

const DialogPages = {
    account: <DialogAccountsView />,
    institution: <DialogInstitutionsView />,
} as const;
