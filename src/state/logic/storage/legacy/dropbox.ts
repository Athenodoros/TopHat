/**
 * What the Dropbox backup of earlier versions of TopHat left behind: a refresh token in the user's
 * settings, and `/data.zip` in the account. That backup only ever wrote, so the zip may hold the only
 * copy of someone's data if their browser has lost its own. It is read, never changed or deleted.
 */

import JSZip from "jszip";
import { DropboxTarget, ErrorResult } from "personal-storage-wrapper";
import type { ListDataState } from "../../../data";
import { DataKeys, DropboxSpec } from "../../../data/types";
import { parseDataJSON } from "../../import";

export const LEGACY_DROPBOX_PATH = "/data.zip";

/** The only file the old backup ever put in the zip */
const LEGACY_DROPBOX_FILE = "data.json";

export type LegacyBackup =
    | { type: "value"; value: ListDataState | null }
    /** Dropbox couldn't be read, or the backup isn't something TopHat can use, as `message` says */
    | { type: "error"; error: ErrorResult | null; message: string };

/**
 * The old backup's data, or null if there is none. It is the store as the entity adapters kept it, the
 * same JSON as an export from the settings page, and is checked the same way: a backup without the user
 * row, or from a newer version of the app, is an error rather than nothing, since it may be someone's data.
 */
export const readLegacyDropboxBackup = async (target: DropboxTarget): Promise<LegacyBackup> => {
    const legacy = DropboxTarget.deserialise({ ...target.serialise(), path: LEGACY_DROPBOX_PATH });
    const contents = await legacy.read();

    if (contents.type === "error") return { type: "error", error: contents, message: "" };
    if (contents.value === null) return { type: "value", value: null };

    try {
        const zip = await JSZip.loadAsync(contents.value.buffer);
        const file = zip.file(LEGACY_DROPBOX_FILE);
        if (!file) return { type: "value", value: null };

        return { type: "value", value: getLists(parseDataJSON(await file.async("string")) as unknown as StoredTables) };
    } catch (error) {
        return {
            type: "error",
            error: null,
            message:
                "The backup an earlier version of TopHat left in this Dropbox account can't be used: " +
                getMessage(error),
        };
    }
};

/**
 * The lists the store's tables flatten to. An old backup may lack a table added since, which reads as
 * missing - and so empty - as it would from a stored value.
 */
type StoredTables = Record<string, { ids?: unknown; entities?: Record<string, unknown> } | undefined>;

const getLists = (stored: StoredTables) =>
    Object.fromEntries(
        DataKeys.flatMap((key) => {
            const table = stored[key];
            if (!Array.isArray(table?.ids) || typeof table?.entities !== "object" || table.entities === null) return [];

            const entities = table.entities;
            return [[key, table.ids.map((id) => entities[String(id)]).filter((entity) => entity !== undefined)]];
        })
    ) as unknown as ListDataState;

/**
 * A target for the token the old backup kept, whose account isn't known until Dropbox is asked. Its
 * access token has expired, so the first request exchanges the refresh token for a new one.
 */
export const getTargetForLegacyToken = (spec: DropboxSpec, clientId: string, path: string) =>
    DropboxTarget.deserialise({
        connection: { clientId, refreshToken: spec.refreshToken, accessToken: "", expiry: new Date(0).toISOString() },
        user: { id: "", email: spec.email, name: spec.name },
        path,
    });

const getMessage = (error: unknown) => (error instanceof Error && error.message) || String(error);
