import styled from "@emotion/styled";
import { Card } from "@mui/material";
import React from "react";

export const ImportDialogFileDisplay: React.FC<{ contents: string }> = ({ contents }) => (
    <ContainerCard variant="outlined">
        <pre>{contents}</pre>
    </ContainerCard>
);

const ContainerCard = styled(Card)({
    margin: "20px 20px 0 20px",
    padding: "10px 15px",
    overflow: "auto",

    "& > pre": { margin: 0 },
});
