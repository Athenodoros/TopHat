import { Dropbox, DropboxAuth } from "dropbox";
import JSZip from "jszip";
import { TopHatDispatch, TopHatStore } from "..";
import { DataSlice } from "../data";
import { StubUserID } from "../data/types";
import { DROPBOX_NOTIFICATION_ID } from "./notifications/variants/dropbox";

const APP_KEY = "7ru69iyjvo0wz6t";
const REDIRECT_URI = `${window.location.origin}/dropbox`;

// Largely from: https://github.com/dropbox/dropbox-sdk-js/blob/main/examples/javascript/pkce-browser/index.html
export const redirectToDropboxAuthURI = async () => {
    const dbxAuth = new DropboxAuth({ clientId: APP_KEY });
    dbxAuth
        .getAuthenticationUrl(REDIRECT_URI, undefined, "code", "offline", undefined, undefined, true)
        .then((authUrl) => {
            window.sessionStorage.clear();
            window.sessionStorage.setItem("codeVerifier", (dbxAuth as any).codeVerifier);
            console.log((dbxAuth as any).codeVerifier, authUrl.toString());
            window.location.href = authUrl.toString();
        })
        .catch((error) => console.error(error));
};

class DBWrapper {
    private static db: Dropbox | null = null;

    static get() {
        if (this.db !== null) return this.db;

        const config = TopHatStore.getState().data.user.entities[StubUserID]!.dropbox;
        if (config === undefined || config === "loading") return null;

        this.db = new Dropbox({ clientId: APP_KEY, refreshToken: config.refreshToken });
        return this.db;
    }
    static set(db: Dropbox) {
        this.db = db;
    }
}

export const maybeSaveDataToDropbox = async () => {
    if (!window.navigator.onLine) return;

    const db = DBWrapper.get();
    if (db === null) return;

    const zip = new JSZip();
    zip.file("data.json", JSON.stringify(TopHatStore.getState().data));
    const data = await zip.generateAsync({
        type: "binarystring",
        compression: "DEFLATE",
    });
    await db
        .filesUpload({
            path: "/data.zip",
            mode: { ".tag": "overwrite" },
            contents: data,
        })
        .then(() => {
            TopHatDispatch(
                DataSlice.actions.updateNotificationState({
                    user: {},
                    id: DROPBOX_NOTIFICATION_ID,
                    contents: null,
                })
            );
        })
        .catch((error) => {
            TopHatDispatch(
                DataSlice.actions.updateNotificationState({
                    user: {},
                    id: DROPBOX_NOTIFICATION_ID,
                    contents: "",
                })
            );
            console.error(error);
        });
};

export const getMaybeDropboxRedirectCode = () => {
    console.log(window.location.search);
    return window.location.search
        .replace("?", "")
        .split("&")
        .find((x) => x.startsWith("code"))
        ?.split("code=")[1];
};

export const dealWithDropboxRedirect = (code: string) => {
    TopHatDispatch(
        DataSlice.actions.updateUserPartial({
            dropbox: "loading",
        })
    );

    const dbxAuth = new DropboxAuth({ clientId: APP_KEY });

    const verifier = window.sessionStorage.getItem("codeVerifier");
    if (verifier) dbxAuth.setCodeVerifier(verifier);

    try {
        dbxAuth
            .getAccessTokenFromCode(REDIRECT_URI, code)
            .then(async (request) => {
                const refreshToken = (request.result as any).refresh_token as string;
                const db = new Dropbox({ clientId: APP_KEY, refreshToken });

                const account = (await db.usersGetCurrentAccount()).result;
                TopHatDispatch(
                    DataSlice.actions.updateUserPartial({
                        dropbox: {
                            refreshToken,
                            email: account.email,
                            name: account.name.display_name,
                        },
                    })
                );

                DBWrapper.set(db);
            })
            .catch((error) => {
                TopHatDispatch(DataSlice.actions.updateUserPartial({ dropbox: undefined }));
                console.error(error);
            });
    } catch (err) {
        TopHatDispatch(
            DataSlice.actions.updateUserPartial({
                dropbox: undefined,
            })
        );
        console.error(err);
    }
};
