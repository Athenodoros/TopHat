import { LocalizationProvider } from "@mui/lab";
import DateAdapter from "@mui/lab/AdapterLuxon";
import { CssBaseline, StyledEngineProvider, ThemeProvider } from "@mui/material";
import { noop, omit } from "lodash-es";
import React from "react";
import { FileRejection, useDropzone } from "react-dropzone";
import { Provider } from "react-redux";
import { TopHatDialog } from "../dialog";
import { TopHatStore } from "../state";
import { handleStatementFileUpload } from "../state/logic/statement";
import { TopHatTheme } from "../styles/theme";
import { PageErrorBoundary } from "./error";
import { PopupDisplay } from "./popups";
import { TopHatTutorial } from "./tutorial";

export const FileHandlerContext = React.createContext<{
    openFileDialog: () => void;
    acceptedFiles: File[];
    fileRejections: FileRejection[];
    isDragActive: boolean;
    dropzoneRef: React.RefObject<HTMLElement> | null;
}>({
    openFileDialog: noop,
    acceptedFiles: [],
    fileRejections: [],
    isDragActive: false,
    dropzoneRef: null,
});

export const TopHatContextProvider: React.FC = ({ children }) => {
    const {
        open: openFileDialog,
        acceptedFiles,
        fileRejections,
        getRootProps,
        getInputProps,
        isDragActive,
        rootRef: dropzoneRef,
    } = useDropzone({
        accept: "text/csv",
        onDrop: handleStatementFileUpload,
    });

    return (
        <>
            <CssBaseline />
            <LocalizationProvider
                dateAdapter={
                    // Typescript thinks that some functions are missing in DateAdapter
                    // This seems just to be a bug in the type definitions
                    DateAdapter as any
                }
            >
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
