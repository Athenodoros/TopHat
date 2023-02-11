import styled from "@emotion/styled";
import { Card, Theme } from "@mui/material";
import { SxProps } from "@mui/system";
import { FCWithChildren } from "../../../shared/types";
import { APP_BACKGROUND_COLOUR } from "../../../styles/theme";

export const TableHeaderContainer: FCWithChildren<{ sx?: SxProps<Theme> }> = ({ children, sx }) => {
    return (
        <ContainerBox>
            <HeaderCard elevation={2} sx={sx}>
                {children}
            </HeaderCard>
        </ContainerBox>
    );
};

const ContainerBox = styled("div")({
    top: 0,
    position: "sticky",
    backgroundColor: APP_BACKGROUND_COLOUR,
    zIndex: 2,
    margin: "-20px -10px 5px -10px",
    padding: "20px 10px 0 10px",
});
const HeaderCard = styled(Card)({
    height: 50,
    display: "flex",
    alignItems: "center",
});
