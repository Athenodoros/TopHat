import styled from "@emotion/styled";
import { Notifications as NotificationsIcon } from "@mui/icons-material";
import { Badge, IconButton, Popover, Typography } from "@mui/material";
import { Box } from "@mui/system";
import { NAVBAR_LOGO_HEIGHT } from "../../app/navbar";
import { Notifications } from "../../app/notifications";
import { usePopoverProps } from "../../shared/hooks";
import { useNotificationCount } from "../../state/data/hooks";

export const Page: React.FC<{ title: string }> = ({ children, title }) => {
    const notifications = useNotificationCount();
    const { buttonProps, popoverProps } = usePopoverProps();

    return (
        <PageContainerBox>
            <TitleBox>
                <Typography variant="h3">{title}</Typography>
                <TitleButtonsBox>
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
                        <Notifications sx={{ maxHeight: 350 }} />
                    </Popover>
                </TitleButtonsBox>
            </TitleBox>
            {children}
        </PageContainerBox>
    );
};

const PageContainerBox = styled(Box)({
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    flexGrow: 1,
    overflowY: "auto",
    padding: "0 60px 200px 60px",
});
const TitleBox = styled(Box)({
    height: NAVBAR_LOGO_HEIGHT,
    flexShrink: 0,
    paddingTop: 4,

    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
});
const TitleButtonsBox = styled(Box)({
    "& > button": {
        marginLeft: 15,
        borderRadius: "50%",
    },
});
