import styled from "@emotion/styled";
import { Box } from "@mui/system";
import React from "react";
import { suppressEvent } from "../../shared/events";
import { Greys } from "../../styles/colours";

/**
 * Dialog Layout Components
 */
export const DialogMain = styled("div")({
    display: "flex",
    backgroundColor: Greys[200],
    minHeight: 0,
    flexGrow: 1,
});

export const DIALOG_OPTIONS_WIDTH = 312;
export const DialogOptions = styled("div")({
    display: "flex",
    flexDirection: "column",
    width: DIALOG_OPTIONS_WIDTH,
    flexShrink: 0,
});

const DialogContentsBox = styled(Box)({
    display: "flex",
    justifyContent: "stretch",
    flexDirection: "column",
    margin: "12px 12px 12px 0",
    backgroundColor: Greys[100],
    borderRadius: "5px",
    flexGrow: 1,
    overflow: "hidden",
});
export const DialogContents: React.FC = (props) => <DialogContentsBox onClick={suppressEvent} {...props} />;
