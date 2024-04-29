import JSZip from "jszip";
import { DateTime } from "luxon";
import { TopHatDispatch, TopHatStore } from "..";
import { BASE_PATHNAME } from "../app";
import { DataSlice } from "../data";
import { StubUserID, User } from "../data/types";
import { conditionallyUpdateNotificationState } from "./notifications/shared";
import { DROPBOX_NOTIFICATION_ID } from "./notifications/variants/dropbox";

const APP_KEY = "7ru69iyjvo0wz6t";
const REDIRECT_URI = `${window.location.origin}${BASE_PATHNAME}/dropbox`;

const AUTH_URL = `https://dropbox.com/oauth2/authorize?response_type=code&client_id=${APP_KEY}&redirect_uri=${REDIRECT_URI}&token_access_type=offline&code_challenge_method=S256`;
const TOKEN_AUTH_URL = `https://api.dropboxapi.com/oauth2/token?grant_type=authorization_code&client_id=${APP_KEY}&redirect_uri=${REDIRECT_URI}`;
const TOKEN_REFRESH_URL = `https://api.dropboxapi.com/oauth2/token?grant_type=refresh_token&client_id=${APP_KEY}`;

const SESSION_STORAGE_KEY = "DROPBOX_CHALLENGE";

const base64Encode = (array: Uint8Array): string =>
    btoa(String.fromCharCode(...(array as unknown as number[])))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
const getCodeVerifier = (): string => {
    const array = new Uint8Array(64);
    crypto.getRandomValues(array);
    return base64Encode(array);
};
const sha256Hash = async (challenge: string): Promise<string> => {
    const array = new TextEncoder().encode(challenge);
    const sha = await crypto.subtle.digest("SHA-256", new Uint8Array(array));
    return base64Encode(new Uint8Array(sha));
};

export const redirectToDropboxAuthURI = async () => {
    const verifier = getCodeVerifier();
    const challenge = await sha256Hash(verifier);

    window.sessionStorage.clear();
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, verifier);

    window.location.href = `${AUTH_URL}&code_challenge=${challenge}`;
};

export const getMaybeDropboxRedirectCode = () => {
    return window.location.search
        .replace("?", "")
        .split("&")
        .find((x) => x.startsWith("code"))
        ?.split("code=")[1];
};

const updateDropboxNotificationState = (failed: boolean) =>
    conditionallyUpdateNotificationState(DROPBOX_NOTIFICATION_ID, failed ? "" : null);
const updateDropboxState = (dropbox: User["dropbox"]) =>
    TopHatDispatch(DataSlice.actions.updateUserPartial({ dropbox }));
let token: {
    access_token: string;
    expires: DateTime;
} | null = null;

export const dealWithDropboxRedirect = (code: string) => {
    updateDropboxState("loading");

    const verifier = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!verifier) return;

    let refresh_token = "";
    return fetch(`${TOKEN_AUTH_URL}&code_verifier=${verifier}&code=${code}`, { method: "POST" })
        .then((response) => response.json())
        .then((access) => {
            token = {
                access_token: access.access_token as string,
                expires: DateTime.now().plus({ seconds: access.expires_in as number }),
            };
            refresh_token = access.refresh_token as string;
            return fetch("https://api.dropboxapi.com/2/users/get_current_account", {
                method: "POST",
                headers: { authorization: `Bearer ${token!.access_token}` },
            });
        })
        .then((response) => response.json())
        .then((user) => {
            updateDropboxNotificationState(false);
            updateDropboxState({
                refreshToken: refresh_token,
                email: user.email,
                name: user.name.display_name,
            });
        })
        .catch((error) => {
            console.error(error);
            updateDropboxNotificationState(true);
            updateDropboxState(undefined);
        });
};

export const maybeSaveDataToDropbox = async () => {
    if (!window.navigator.onLine) return;

    // Early return if dropbox syncing is not set up
    const config = TopHatStore.getState().data.user.entities[StubUserID]!.dropbox;
    if (config === undefined || config === "loading") {
        token = null;
        return;
    }

    // Refresh token if necessary
    if (token === null || DateTime.now() > token.expires) {
        await fetch(`${TOKEN_REFRESH_URL}&refresh_token=${config.refreshToken}`, {
            headers: { "Content-Type": "application/json" },
            method: "POST",
        })
            .then((response) => response.json())
            .then((access) => {
                token = {
                    access_token: access.access_token as string,
                    expires: DateTime.now().plus({ seconds: access.expires_in as number }),
                };
            })
            .catch((error) => {
                console.error(error);
                token = null;
            });
    }

    if (token === null) {
        updateDropboxNotificationState(true);
        return;
    }

    // Generate Zip file
    const zip = new JSZip();
    zip.file("data.json", JSON.stringify(TopHatStore.getState().data));
    const data = await zip.generateAsync({
        type: "binarystring",
        compression: "DEFLATE",
    });

    // Push data to dropbox
    await fetch("https://content.dropboxapi.com/2/files/upload", {
        method: "POST",
        headers: {
            "Content-Type": "application/octet-stream",
            "Dropbox-API-Arg": `{"path": "/data.zip","mode": "overwrite"}`,
            authorization: `Bearer ${token.access_token}`,
        },
        body: data,
    })
        .then(() => updateDropboxNotificationState(false))
        .catch(() => updateDropboxNotificationState(true));
};
