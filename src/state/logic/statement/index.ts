import { FileRejection } from "react-dropzone";
import { TopHatDispatch, TopHatStore } from "../..";
import { AppSlice } from "../../app";
import { DefaultDialogs } from "../../app/defaults";
import { DialogStatementFileState } from "../../app/statementTypes";
import { addStatementFilesToDialog } from "./actions";
import { DialogFileDescription } from "./types";

export * from "./actions";
export * from "./types";

export const handleStatementFileUpload = (rawFiles: File[], rejections: FileRejection[]) => {
    const { import: state, id } = TopHatStore.getState().app.dialog;
    const { account, detectAccount } = state as DialogStatementFileState;

    if (rejections.length) {
        TopHatDispatch(
            AppSlice.actions.setDialogPartial({
                id: "import",
                import: { page: "file", account, rejections, detectAccount: detectAccount || false },
            })
        );
    } else if (rawFiles.length) {
        if (id !== "import" || state.page !== "parse")
            TopHatDispatch(AppSlice.actions.setDialogPartial({ id: "import", import: DefaultDialogs.import }));

        getFilesContents(rawFiles).then((files) => addStatementFilesToDialog(files));
    }
};

let id = 0;
export const getFilesContents = (files: File[]) =>
    Promise.all(
        files.map(
            (file) =>
                new Promise<DialogFileDescription>((resolve, reject) => {
                    const fileReader = new FileReader();
                    fileReader.onload = (event) => {
                        id++;

                        event.target
                            ? resolve({
                                  id: id + "",
                                  name: file.name,
                                  contents: event.target.result as string,
                              })
                            : reject();
                    };
                    fileReader.onerror = reject;
                    fileReader.readAsText(file);
                })
        )
    );
