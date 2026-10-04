/**
 * A fake of the parts of Dropbox that TopHat talks to - signing in, the account, and reading and
 * writing files - answered in-process through `fetch`, with the sign-in popup stood in for by a
 * `window.open` that comes straight back with a code.
 *
 * Files are kept as the bytes Dropbox would hold, and written and read here with Node's gzip and the
 * zip library the old backup used, rather than the storage library, so that tests describe what is
 * really left in someone's account. Like Dropbox, each write is given a revision whose first 13 hex
 * digits are the time of the write in microseconds, within the second `server_modified` gives.
 */

import JSZip from "jszip";
import { gunzipSync, gzipSync } from "node:zlib";
import { vi } from "vitest";
import type { ListDataState } from "../../data";
import { DataKeys } from "../../data/types";

export const DROPBOX_FILE = "/data.json.gz";
export const LEGACY_DROPBOX_FILE = "/data.zip";

export const ACCOUNT = { account_id: "dbid:test-account", email: "user@example.com", name: { display_name: "A User" } };
export const AUTH_CODE = "test-auth-code";
export const REFRESH_TOKEN = "test-refresh-token";

interface StoredFile {
    bytes: Uint8Array;
    rev: string;
    serverModified: string;
}

interface FakeResponse {
    status: number;
    json: () => Promise<unknown>;
    arrayBuffer: () => Promise<ArrayBuffer>;
}

export class FakeDropbox {
    files = new Map<string, StoredFile>();
    /** Every request, as `METHOD url` or the API route */
    requests: string[] = [];

    /** Refresh tokens Dropbox still accepts, and the access tokens it has handed out */
    refreshTokens = new Set([REFRESH_TOKEN]);
    private accessTokens = new Set<string>();

    /** An authorisation code the popup comes back with, and whether Dropbox will exchange it */
    code: string | null = AUTH_CODE;
    codeRefused = false;

    /** API routes that answer as though the app's grant lacked the scope they need */
    missingScope = new Set<string>();

    private lastWrite = 0;

    reset() {
        this.files.clear();
        this.requests = [];
        this.refreshTokens = new Set([REFRESH_TOKEN]);
        this.accessTokens.clear();
        this.code = AUTH_CODE;
        this.codeRefused = false;
        this.missingScope.clear();
        setOnline(true);
    }

    /**
     * Files, as a test sets them up or reads them back
     */

    put(path: string, bytes: Uint8Array) {
        // The library times a revision to the millisecond, and two writes here can come within one, where
        // two real writes are a network round trip apart: each is given a millisecond of its own
        const millis = Math.max(Date.now(), this.lastWrite + 1);
        this.lastWrite = millis;

        const micros = BigInt(millis) * 1000n + 123n;
        const serverModified = new Date(Math.floor(millis / 1000) * 1000).toISOString().replace(".000Z", "Z");
        this.files.set(path, { bytes, rev: micros.toString(16).padStart(13, "0") + "80c59881", serverModified });
    }

    /** Saves a value where TopHat syncs to, compressed as the library compresses it */
    putValue(value: unknown) {
        this.put(DROPBOX_FILE, new Uint8Array(gzipSync(JSON.stringify(value))));
    }

    /** The synced value, decompressed without the library, or null if there is no file */
    readValue<V = ListDataState>(): V | null {
        const file = this.files.get(DROPBOX_FILE);
        return file ? (JSON.parse(gunzipSync(file.bytes).toString()) as V) : null;
    }

    /** The backup earlier versions wrote: the store as the entity adapters kept it, as `data.json` in a zip */
    async putLegacyBackup(value: ListDataState) {
        const zip = new JSZip();
        zip.file("data.json", JSON.stringify(toStoredState(value)));
        this.put(LEGACY_DROPBOX_FILE, await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }));
    }

    /**
     * The API
     */

    fetch = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<FakeResponse> => {
        const url = new URL(String(input));
        const route = url.pathname.replace(/^\/(2\/)?/, "");
        this.requests.push(route);

        if (!navigator.onLine) throw new TypeError("Failed to fetch");

        if (route === "oauth2/token") return this.token(url.searchParams);

        const access = String((init.headers as Record<string, string>)?.authorization ?? "").replace("Bearer ", "");
        if (!this.accessTokens.has(access))
            return respond(401, {
                error_summary: "invalid_access_token/..",
                error: { ".tag": "invalid_access_token" },
            });
        if (this.missingScope.has(route))
            return respond(401, {
                error_summary: "missing_scope/..",
                error: { ".tag": "missing_scope", required_scope: "files.content.read" },
            });

        switch (route) {
            case "users/get_current_account":
                return respond(200, ACCOUNT);
            case "files/get_metadata": {
                const file = this.files.get(JSON.parse(String(init.body)).path);
                return file
                    ? respond(200, { rev: file.rev, server_modified: file.serverModified })
                    : respond(409, { error_summary: "path/not_found/..", error: { ".tag": "path" } });
            }
            case "files/download": {
                const rev = JSON.parse((init.headers as Record<string, string>)["Dropbox-API-Arg"]).path.slice(4);
                const file = Array.from(this.files.values()).find((file) => file.rev === rev);
                return file
                    ? respond(200, null, file.bytes)
                    : respond(409, { error_summary: "path/not_found/..", error: { ".tag": "path" } });
            }
            case "files/upload": {
                const { path } = JSON.parse((init.headers as Record<string, string>)["Dropbox-API-Arg"]);
                this.put(path, new Uint8Array(init.body as ArrayBuffer).slice());
                const file = this.files.get(path)!;
                return respond(200, { rev: file.rev, server_modified: file.serverModified });
            }
            default:
                return respond(400, { error_summary: "unknown_route/.." });
        }
    };

    private token(params: URLSearchParams) {
        const refreshToken =
            params.get("grant_type") === "authorization_code"
                ? params.get("code") === this.code && !this.codeRefused
                    ? REFRESH_TOKEN
                    : null
                : params.get("refresh_token");

        if (refreshToken === null || !this.refreshTokens.has(refreshToken))
            return respond(400, {
                error: "invalid_grant",
                error_description:
                    params.get("grant_type") === "authorization_code"
                        ? "code doesn't exist or has expired"
                        : "refresh token is invalid or revoked",
            });

        const access = "access-" + this.accessTokens.size;
        this.accessTokens.add(access);
        return respond(200, { access_token: access, refresh_token: refreshToken, expires_in: 14400 });
    }

    /**
     * The popup, which comes back to the redirect URI with the code on it - or, with no code, is closed
     */
    open = (url: string) => {
        if (this.code === null) return null;

        const redirect = new URL(url).searchParams.get("redirect_uri")!;
        return {
            closed: false,
            close: vi.fn(),
            location: {
                origin: window.location.origin,
                href: `${redirect}?code=${this.code}`,
                search: `?code=${this.code}`,
            },
        };
    };
}

/** Puts the fake in place of the network and the popup for the rest of the file */
export const installFakeDropbox = () => {
    const dropbox = new FakeDropbox();
    vi.stubGlobal("fetch", dropbox.fetch);
    vi.spyOn(window, "open").mockImplementation(dropbox.open as unknown as typeof window.open);
    setOnline(true);
    return dropbox;
};

/** jsdom's navigator has no `onLine` of its own, and requests to Dropbox check it before going out */
export const setOnline = (online: boolean) =>
    Object.defineProperty(window.navigator, "onLine", { value: online, configurable: true });

const respond = (status: number, json: unknown, bytes?: Uint8Array): FakeResponse => ({
    status,
    json: async () => json,
    arrayBuffer: async () => (bytes ?? new Uint8Array()).slice().buffer,
});

/** Lists as the entity adapters keep them: `{ ids, entities }` for each */
const toStoredState = (value: ListDataState) =>
    Object.fromEntries(
        DataKeys.map((key) => {
            const list = (value[key] ?? []) as { id: string | number }[];
            return [
                key,
                { ids: list.map(({ id }) => id), entities: Object.fromEntries(list.map((item) => [item.id, item])) },
            ];
        })
    );
