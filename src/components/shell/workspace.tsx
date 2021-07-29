import LuxonUtils from "@date-io/luxon";
import { CssBaseline, ThemeProvider } from "@material-ui/core";
import { MuiPickersUtilsProvider } from "@material-ui/pickers";
import { noop, omit } from "lodash-es";
import { SnackbarProvider } from "notistack";
import React from "react";
import { FileRejection, useDropzone } from "react-dropzone";
import { Provider } from "react-redux";
import { TopHatStore } from "../../state";
import { theme } from "../../styles/theme";
import { TopHatDialog } from "../dialog";

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
                <MuiPickersUtilsProvider utils={LuxonUtils}>
                    <ThemeProvider theme={theme}>
                        <FileHandlerContext.Provider
                            value={{ openFileDialog, acceptedFiles, fileRejections, isDragActive, dropzoneRef }}
                        >
                            <Provider store={TopHatStore}>
                                <TopHatDialog />
                                <div {...omit(getRootProps(), ["onClick"])}>
                                    <input
                                        id="file-upload-dropzone"
                                        {...getInputProps({ style: { display: "none" } })}
                                    />
                                    {children}
                                </div>
                            </Provider>
                        </FileHandlerContext.Provider>
                    </ThemeProvider>
                </MuiPickersUtilsProvider>
            </SnackbarProvider>
        </>
    );
};
