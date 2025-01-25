import { FileRejection } from "react-dropzone";
import { TopHatDispatch, TopHatStore } from "../..";
import { AppSlice } from "../../app";
import { DefaultDialogs } from "../../app/defaults";
import { DialogStatementFileState } from "../../app/statementTypes";
import { addStatementFilesToDialog } from "./actions";
import { DialogFileDescription } from "./types";
import { StubUserID } from "../../data/types";
import { importJSONData } from "../import";

export * from "./actions";
export * from "./types";

export const handleStatementFileUpload = (rawFiles: File[], rejections: FileRejection[]) => {
    const storeState = TopHatStore.getState();
    const { import: state, id } = storeState.app.dialog;
    const isTutorial = storeState.data.user.entities[StubUserID]?.tutorial;
    const { account } = state as DialogStatementFileState;

    if (rejections.length) {
        if (rejections.length === 1 && rejections[0].file.name.endsWith(".json") && isTutorial) {
            getFilesContents([rejections[0].file]).then((files) => importJSONData(files[0].contents));
            return;
        }

        TopHatDispatch(
            AppSlice.actions.setDialogPartial({
                id: "import",
                import: { page: "file", account, rejections },
            })
        );
    } else if (rawFiles.length) {
        if (id !== "import" || state.page !== "parse")
            TopHatDispatch(
                AppSlice.actions.setDialogPartial({
                    id: "import",
                    import: {
                        account: state.account,
                        ...DefaultDialogs.import,
                    },
                })
            );

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
