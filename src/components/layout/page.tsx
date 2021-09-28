import { Badge, IconButton, Popover, Typography } from "@mui/material";
import makeStyles from '@mui/styles/makeStyles';
import { Camera, Notifications as NotificationsIcon } from "@mui/icons-material";
import { DemoStatementFiles } from "../../state/data/demo";
import { useNotificationCount } from "../../state/data/hooks";
import { createAndDownloadFile } from "../../utilities/data";
import { usePopoverProps } from "../../utilities/hooks";
import { NAVBAR_LOGO_HEIGHT } from "../shell/navbar";
import { Notifications } from "../shell/notifications";

const usePageStyles = makeStyles((theme) => ({
    page: {
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        flexGrow: 1,
        overflowY: "auto",
        padding: "0 60px 30px 60px",
    },

    title: {
        height: NAVBAR_LOGO_HEIGHT,
        flexShrink: 0,
        paddingTop: 4,

        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
    },

    titleButtons: {
        "& > button": {
            marginLeft: 15,
            borderRadius: "50%",
        },
    },
}));

export const Page: React.FC<{ title: string; padding?: number }> = ({ children, title, padding }) => {
    const notifications = useNotificationCount();
    const classes = usePageStyles();
    const { buttonProps, popoverProps } = usePopoverProps();

    return (
        <div className={classes.page} style={padding ? { paddingBottom: padding } : undefined}>
            <div className={classes.title}>
                <Typography variant="h3">{title}</Typography>
                <div className={classes.titleButtons}>
                    <IconButton {...buttonProps} size="large">
                        <Badge badgeContent={notifications} color="error" overlap="circular" variant="dot">
                            <NotificationsIcon />
                        </Badge>
                    </IconButton>
                    <Popover
                        {...popoverProps}
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                        transformOrigin={{ vertical: "top", horizontal: "right" }}
                    >
                        <Notifications />
                    </Popover>
                    <IconButton onClick={downloadExampleStatements} size="large">
                        <Camera />
                    </IconButton>
                </div>
            </div>
            {children}
        </div>
    );
};

// const openDialog = () => TopHatDispatch(AppSlice.actions.setDialogPage("account"));
const downloadExampleStatements = () =>
    DemoStatementFiles.forEach(({ name, contents }) => createAndDownloadFile(name, contents));
