import { CssBaseline, StyledEngineProvider, ThemeProvider } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { noop, omit } from "lodash-es";
import React, { useState } from "react";
import { FileRejection, useDropzone } from "react-dropzone";
import { Provider } from "react-redux";
import { TopHatDialog } from "../dialog";
import { FCWithChildren } from "../shared/types";
import { TopHatStore } from "../state";
import { handleJSONFileUpload } from "../state/logic/import";
import { handleStatementFileUpload } from "../state/logic/statement";
import { TopHatTheme } from "../styles/theme";
import { PageErrorBoundary } from "./error";
import { PopupDisplay } from "./popups";
import { TopHatTutorial } from "./tutorial";

/**
 * Which flow owns files dropped anywhere on the app: CSV statements into the import dialog, or (while the
 * tutorial is showing) a whole TopHat JSON export or ZIP backup.
 */
export type FileImportHandler = "JSON-IMPORT" | "GENERAL-IMPORT";

export const FileHandlerContext = React.createContext<{
    openFileDialog: () => void;
    acceptedFiles: File[];
    fileRejections: FileRejection[];
    isDragActive: boolean;
    dropzoneRef: React.RefObject<HTMLElement> | null;
    fileImportHandler: FileImportHandler;
    setFileImportHandler: (handler: FileImportHandler) => void;
}>({
    openFileDialog: noop,
    acceptedFiles: [],
    fileRejections: [],
    isDragActive: false,
    dropzoneRef: null,
    fileImportHandler: "GENERAL-IMPORT",
    setFileImportHandler: noop,
});

export const TopHatContextProvider: FCWithChildren = ({ children }) => {
    const [fileImportHandler, setFileImportHandler] = useState<FileImportHandler>("GENERAL-IMPORT");

    const {
        open: openFileDialog,
        acceptedFiles,
        fileRejections,
        getRootProps,
        getInputProps,
        isDragActive,
        rootRef: dropzoneRef,
    } = useDropzone(
        fileImportHandler === "GENERAL-IMPORT"
            ? { accept: { "text/csv": [".csv"] }, onDrop: handleStatementFileUpload }
            : {
                  accept: {
                      "application/json": [".json"],
                      "application/zip": [".zip"],
                      "application/x-zip-compressed": [".zip"],
                  },
                  multiple: false,
                  onDrop: handleJSONFileUpload,
              }
    );

    return (
        <>
            <CssBaseline />
            <LocalizationProvider dateAdapter={AdapterLuxon}>
                <StyledEngineProvider injectFirst={true}>
                    <ThemeProvider theme={TopHatTheme}>
                        <PopupDisplay>
                            <PageErrorBoundary>
                                <FileHandlerContext.Provider
                                    value={{
                                        openFileDialog,
                                        acceptedFiles,
                                        fileRejections,
                                        isDragActive,
                                        dropzoneRef,
                                        fileImportHandler,
                                        setFileImportHandler,
                                    }}
                                >
                                    <Provider store={TopHatStore}>
                                        <div {...omit(getRootProps(), ["onClick"])}>
                                            <TopHatDialog />
                                            <TopHatTutorial />
                                            <input
                                                id="file-upload-dropzone"
                                                {...getInputProps({ style: { display: "none" } })}
                                            />
                                            {children}
                                        </div>
                                    </Provider>
                                </FileHandlerContext.Provider>
                            </PageErrorBoundary>
                        </PopupDisplay>
                    </ThemeProvider>
                </StyledEngineProvider>
            </LocalizationProvider>
        </>
    );
};
