import { TopHatDispatch } from "..";
import { DataSlice } from "../data";

const APP_KEY = "7ru69iyjvo0wz6t";
const REDIRECT_URI = `${window.location.origin}/dropbox`;

const AUTH_URL = `https://dropbox.com/oauth2/authorize?response_type=code&client_id=${APP_KEY}&redirect_uri=${REDIRECT_URI}&token_access_type=offline&code_challenge_method=S256&code_challenge=`;
const TOKEN_URL = `https://api.dropboxapi.com/oauth2/token?grant_type=authorization_code&client_id=${APP_KEY}&redirect_uri=${REDIRECT_URI}&code_verifier=`;

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

    window.location.href = AUTH_URL + challenge;
};

export const getMaybeDropboxRedirectCode = () => {
    return window.location.search
        .replace("?", "")
        .split("&")
        .find((x) => x.startsWith("code"))
        ?.split("code=")[1];
};

let access_token: string | null = null;

export const dealWithDropboxRedirect = async (code: string) => {
    TopHatDispatch(DataSlice.actions.updateUserPartial({ dropbox: "loading" }));

    const verifier = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!verifier) return;

    const access = await fetch(TOKEN_URL + verifier + "&code=" + code, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }).then((response) => response.json());
    access_token = access.access_token as string;

    const user = await fetch("https://api.dropboxapi.com/2/users/get_current_account", {
        method: "POST",
        headers: {
            "content-type": "text/plain; charset=dropbox-cors-hack",
            authorization: `Bearer ${access_token}`,
        },
    }).then((response) => response.json());
    TopHatDispatch(
        DataSlice.actions.updateUserPartial({
            dropbox: {
                refreshToken: access.refresh_token as string,
                email: user.email,
                name: user.name.display_name,
            },
        })
    );

    console.log(user);
};

export const maybeSaveDataToDropbox = async () => {};
