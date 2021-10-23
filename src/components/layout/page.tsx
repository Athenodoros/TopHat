import { Notifications as NotificationsIcon } from "@mui/icons-material";
import { Badge, IconButton, Popover, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { NAVBAR_LOGO_HEIGHT } from "../../app/navbar";
import { Notifications } from "../../app/notifications";
import { usePopoverProps } from "../../shared/hooks";
import { useNotificationCount } from "../../state/data/hooks";

const usePageStyles = makeStyles((theme) => ({
    page: {
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        flexGrow: 1,
        overflowY: "auto",
        padding: "0 60px 200px 60px",
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

export const Page: React.FC<{ title: string }> = ({ children, title }) => {
    const notifications = useNotificationCount();
    const classes = usePageStyles();
    const { buttonProps, popoverProps } = usePopoverProps();

    return (
        <div className={classes.page}>
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
                </div>
            </div>
            {children}
        </div>
    );
};
