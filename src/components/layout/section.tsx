import styled from "@emotion/styled";
import { Paper, Typography } from "@mui/material";
import { Box, SxProps } from "@mui/system";
import React from "react";
import { Greys } from "../../styles/colours";
import { getThemeTransition } from "../../styles/theme";

export const SECTION_MARGIN = 40;

export interface SectionProps {
    title?: string;
    headers?: React.ReactNode | React.ReactNode[];
    emptyBody?: boolean;
    onClick?: () => void;
    sx?: SxProps;
    PaperSx?: SxProps;
}
export const Section: React.FC<SectionProps> = ({ title, headers, children, emptyBody, onClick, sx, PaperSx }) => {
    return (
        <SectionBox sx={sx}>
            {title || headers ? (
                <SectionHeaderBox>
                    <Typography variant="h6">{title}</Typography>
                    <Box sx={{ display: "flex", alignItems: "center" }}>{headers}</Box>
                </SectionHeaderBox>
            ) : undefined}
            {emptyBody ? (
                children
            ) : (
                <SectionBodyPaper variant="outlined" onClick={onClick} sx={PaperSx}>
                    {children}
                </SectionBodyPaper>
            )}
        </SectionBox>
    );
};

const SectionBox = styled(Box)({
    display: "flex",
    flexDirection: "column",
    justifyContent: "stretch",
});
const SectionHeaderBox = styled("div")({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    height: 32,
    flexShrink: 0,
    zIndex: 2, // For tables, so that the title is visible over the raised header

    "& > h6": {
        color: Greys[600],
    },

    "& button": {
        color: Greys[600] + " !important",
        transition: getThemeTransition("color"),
    },

    "& > div:last-child > *": {
        marginLeft: 20,
    },
});
const SectionBodyPaper = styled(Paper)({
    marginBottom: 50,
    flexGrow: 1,
    padding: 20,
});
