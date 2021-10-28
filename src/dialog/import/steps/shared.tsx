import styled from "@emotion/styled";
import { inputClasses, TextField } from "@mui/material";
import { Greys } from "../../../styles/colours";

export const DialogImportOptionsContainerBox = styled("div")({ maxHeight: 220, overflowY: "auto" });

export const DialogImportOptionBox = styled("div")({
    height: 40,
    display: "flex",
    marginRight: 19,
    alignItems: "center",

    "& p": { color: Greys[900] },
    "& > p:first-of-type": { flexGrow: 1 },
});

export const DialogImportOptionTitleContainerBox = styled("div")({
    flexGrow: 1,
    display: "flex",
    alignItems: "center",

    "& p": { marginRight: 3 },
});

export const DialogImportActionsBox = styled("div")({
    display: "flex",
    float: "right",
    marginTop: 15,
    marginRight: 19,

    "& > *": { marginRight: "15px !important" },
});

export const DialogImportInputTextField = styled(TextField)({
    width: 120,
    marginTop: 4,

    [`& .${inputClasses.input}`]: { textAlign: "center" },
});
