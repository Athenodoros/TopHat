import styled from "@emotion/styled";
import { Typography } from "@mui/material";
import { Box } from "@mui/system";
import chroma from "chroma-js";
import React from "react";
import { IconType } from "../../shared/types";
import { Intents } from "../../styles/colours";

const Container = styled(Box)({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    margin: "auto",
    padding: 40,
});
const IconSx = { margin: 10, height: 50, width: 50 };
const Subtitle = styled(Typography)({ opacity: 0.8, maxWidth: 300, textAlign: "center", margin: "5px 0 10px 0" });

interface NonIdealStateProps {
    icon: IconType;
    title: string;
    intent?: keyof typeof Intents;
    subtitle?: string;
    action?: React.ReactNode;
}
export const NonIdealState: React.FC<NonIdealStateProps> = ({ icon: Icon, title, subtitle, intent, action }) => (
    <Container>
        <Icon
            htmlColor={chroma(Intents[intent || "default"].light)
                .alpha(0.5)
                .hex()}
            sx={IconSx}
        />
        <Typography variant="h6">{title}</Typography>
        {subtitle ? <Subtitle variant="body2">{subtitle}</Subtitle> : undefined}
        {action}
    </Container>
);
