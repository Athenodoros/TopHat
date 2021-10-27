import styled from "@emotion/styled";
import { Card, Theme } from "@mui/material";
import { Box, SxProps } from "@mui/system";
import React from "react";
import { APP_BACKGROUND_COLOUR } from "../../../styles/theme";

export const TableHeaderContainer: React.FC<{ sx?: SxProps<Theme> }> = ({ children, sx }) => {
    return (
        <ContainerBox>
            <HeaderCard elevation={2} sx={sx}>
                {children}
            </HeaderCard>
        </ContainerBox>
    );
};

const ContainerBox = styled(Box)({
    top: 0,
    position: "sticky",
    backgroundColor: APP_BACKGROUND_COLOUR,
    zIndex: 1,
    margin: "-20px -10px 5px -10px",
    padding: "20px 10px 0 10px",
});
const HeaderCard = styled(Card)({
    height: 50,
    display: "flex",
    alignItems: "center",
});
