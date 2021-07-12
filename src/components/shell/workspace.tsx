import { CssBaseline, ThemeProvider } from "@material-ui/core";
import { noop, omit } from "lodash-es";
import { SnackbarProvider } from "notistack";
import React from "react";
import { FileRejection, useDropzone } from "react-dropzone";
import { Provider } from "react-redux";
import { TopHatStore } from "../../state";
import { theme } from "../../styles/theme";

export const FileHandlerContext = React.createContext<{
    openFileDialog: () => void;
    acceptedFiles: File[];
    fileRejections: FileRejection[];
    isDragActive: boolean;
    dropzoneRef: React.RefObject<HTMLElement>;
}>({
    openFileDialog: noop,
    acceptedFiles: [],
    fileRejections: [],
    isDragActive: false,
    dropzoneRef: null as unknown as React.RefObject<HTMLElement>,
});

export const Workspace: React.FC = ({ children }) => {
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
        multiple: false,
    });

    return (
        <>
            <CssBaseline />
            <SnackbarProvider>
                <ThemeProvider theme={theme}>
                    <FileHandlerContext.Provider
                        value={{ openFileDialog, acceptedFiles, fileRejections, isDragActive, dropzoneRef }}
                    >
                        <Provider store={TopHatStore}>
                            <div {...omit(getRootProps(), ["onClick"])}>
                                <input id="file-upload-dropzone" {...getInputProps({ style: { display: "none" } })} />
                                {children}
                            </div>
                        </Provider>
                    </FileHandlerContext.Provider>
                </ThemeProvider>
            </SnackbarProvider>
        </>
    );
};