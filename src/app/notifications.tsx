import styled from "@emotion/styled";
import { CheckCircleOutline, Clear } from "@mui/icons-material";
import { Button, Collapse, Fade, IconButton, Typography } from "@mui/material";
import { Box, SxProps } from "@mui/system";
import React, { useCallback, useState } from "react";
import { NonIdealState } from "../components/display/NonIdealState";
import { useAllNotifications } from "../state/data/hooks";
import { getNotificationDisplayMetadata, NotificationDisplayMetadata } from "../state/logic/notifications";
import { Greys } from "../styles/colours";

const NotificationDisplay: React.FC<NotificationDisplayMetadata> = ({
    icon: Icon,
    title,
    dismiss,
    colour,
    buttons,
    children,
}) => {
    const [grow, setGrow] = useState(true);

    const [closedProgrammatically, setClosedProgrammatically] = useState(false);
    const programmaticDismiss = useCallback(() => {
        setGrow(false);
        setClosedProgrammatically(true);
    }, []);
    const onExited = useCallback(() => dismiss && dismiss(closedProgrammatically), [dismiss, closedProgrammatically]);

    return (
        <ContainerCollapse in={grow} onExited={onExited}>
            <Fade in={grow}>
                <NotificationBox style={{ borderColor: colour }}>
                    <BackdropBox style={{ backgroundColor: colour }} />
                    <ContentsBox>
                        <Icon sx={{ margin: 3, marginRight: 23 }} htmlColor={Greys[800]} fontSize="small" />
                        <Typography variant="subtitle2" flexGrow={1}>
                            {title}
                        </Typography>
                        {dismiss && (
                            <IconButton onClick={() => setGrow(false)} size="small">
                                <Clear fontSize="inherit" />
                            </IconButton>
                        )}
                    </ContentsBox>
                    {children}
                    {buttons ? (
                        <ButtonContainerBox>
                            {buttons.map(({ text, onClick }, idx) => (
                                <SpacedButton
                                    onClick={() => onClick(programmaticDismiss)}
                                    size="small"
                                    key={idx}
                                    color="inherit"
                                >
                                    {text}
                                </SpacedButton>
                            ))}
                        </ButtonContainerBox>
                    ) : (
                        <Box height={25} />
                    )}
                </NotificationBox>
            </Fade>
        </ContainerCollapse>
    );
};

export const Notifications: React.FC<{ sx?: SxProps }> = ({ sx }) => {
    const notifications = useAllNotifications();

    return (
        <Box sx={{ width: 350, overflowY: "auto", ...sx }}>
            {notifications.length ? (
                notifications.map((notification) => (
                    <NotificationDisplay
                        key={notification.id + "-" + notification.contents}
                        {...getNotificationDisplayMetadata(notification)}
                    />
                ))
            ) : (
                <NonIdealState icon={CheckCircleOutline} title="No Notifications!" intent="app" />
            )}
        </Box>
    );
};

const ContainerCollapse = styled(Collapse)({ marginBottom: 20, "&:first-of-type": { marginTop: 20 } });
const NotificationBox = styled(Box)({
    display: "flex",
    flexDirection: "column",
    borderLeft: "3px solid transparent",
    position: "relative",
    overflow: "hidden",
    padding: "0 17px",
    fontSize: 20,
    // width: 350
});
const ContentsBox = styled(Box)({ display: "flex", alignItems: "center", margin: "9px 0 7px 0" });
const BackdropBox = styled(Box)({
    position: "absolute",
    width: 240,
    height: 240,
    left: -242.71,
    top: -97.83,
    opacity: 0.1,
    borderRadius: 40,
    transform: "rotate(20deg)",
    transformOrigin: "bottom left",
});
const ButtonContainerBox = styled(Box)({ display: "flex", justifyContent: "flex-end", margin: 5 });
const SpacedButton = styled(Button)({ marginLeft: 10 });
