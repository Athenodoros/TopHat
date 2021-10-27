import styled from "@emotion/styled";
import { Clear } from "@mui/icons-material";
import { alpha, IconButton, Tab, tabClasses, Tabs } from "@mui/material";
import React from "react";
import { withSuppressEvent } from "../../../shared/events";
import { changeFileSelection, removeStatementFileFromDialog } from "../../../state/logic/statement";
import { Greys, Intents, WHITE } from "../../../styles/colours";
import { useNonFileDialogStatementState } from "./shared";

export const ImportDialogFileTabs: React.FC = () => {
    const state = useNonFileDialogStatementState();
    const currentFileParsed = state.columns.all[state.file].matches;

    return (
        <ContainerTabs
            value={state.file}
            onChange={onFileChange}
            variant="scrollable"
            indicatorColor={currentFileParsed ? "primary" : "secondary"}
            scrollButtons="auto"
        >
            {state.files.map((file) => (
                <Tab
                    key={file.id}
                    label={<TabLabelWrapperSpan>{file.name}</TabLabelWrapperSpan>}
                    value={file.id}
                    sx={state.columns.all[file.id].matches ? undefined : { color: Intents.danger.main }}
                    icon={
                        <TabIconButton
                            size="small"
                            onClick={withSuppressEvent<HTMLButtonElement>(() => removeStatementFileFromDialog(file.id))}
                            sx={
                                state.columns.all[file.id].matches
                                    ? undefined
                                    : { color: alpha(Intents.danger.main, 0.6) }
                            }
                        >
                            <Clear fontSize="small" />
                        </TabIconButton>
                    }
                    component="div"
                    wrapped={true}
                />
            ))}
        </ContainerTabs>
    );
};

const onFileChange = (_: React.SyntheticEvent, id: string) => changeFileSelection(id);

const ContainerTabs = styled(Tabs)({
    background: WHITE,
    borderBottom: "1px solid " + Greys[400],
    flexShrink: 0,

    [`& .${tabClasses.root}`]: {
        minHeight: 48,
        padding: "0 18px",
        flexDirection: "row-reverse",
    },
});
const TabIconButton = styled(IconButton)({ margin: "0 -5px 0 5px !important" });
const TabLabelWrapperSpan = styled("span")({ overflow: "hidden", textOverflow: "ellipsis", maxWidth: 150 });
