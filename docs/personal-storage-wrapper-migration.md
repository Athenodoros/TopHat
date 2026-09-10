# Plan: replace Dexie + bespoke Dropbox sync with personal-storage-wrapper

Written 2026-09-09 for a coding agent to execute. Read the whole thing before starting; the
"Gotchas" section lists the ways this migration can silently lose data.

**Done 2026-09-09.** See "What turned out differently" at the end for where the work departed from
this plan - mainly three more library defects than the four listed in §3, and a different dependency
mechanism detail.

## 1. Goal

Replace the hand-rolled IndexedDB layer (`dexie` + `dexie-observable`, `src/state/logic/storage/`)
and the in-place Dropbox OAuth/backup code (`src/state/logic/dropbox.ts`) with the sibling library
`../personal-storage-wrapper` ("PSW"). PSW is Henry's own library: one JSON value, synced across a
set of "targets" (IndexedDB, Dropbox, Google Drive, memory), with cross-tab sync over
`BroadcastChannel`, gzip compression and a popup-based OAuth flow.

Hard requirements:

1. **Nobody loses data.** Anyone with data in the old Dexie database (`TopHatDatabase`) must see it
   after upgrading, and it must be copied into the new store. The old database is kept until the new
   store has been booted from successfully on **ten separate boots spread over at least fourteen
   days**, and only then deleted.
2. **New data wins.** Once the new store holds data it is loaded in preference to the legacy database,
   even if both exist.
3. **The saved-data contract is pinned by tests**, the way it is today in `src/state/logic/storage/`.
   The existing raw-IndexedDB fixtures are how legacy databases are seeded in tests; they must not be
   rewritten against the new library.
4. **No behaviour regressions** outside storage: routing, tutorial/demo, notifications, currency
   syncs and the settings dialogs keep working.

Explicit non-goals: Google Drive support (PSW makes it possible later; do not wire it up now), any
UI redesign beyond what the storage settings page needs, fixing unrelated bugs, upgrading other
dependencies.

Working conventions Henry has asked for (see memory `tophat-storage-test-conventions`):

-   Keep the set of tests minimal; one test per mechanism, not per permutation.
-   Tests read and write IndexedDB through the raw browser API, never through the library under test.
-   Do not assert broken behaviour. If something is left broken, leave a commented-out test of the
    correct behaviour with a `KNOWN BUG` note.
-   Preserve existing behaviour rather than tidying code you pass through.

## 2. What exists today (read these files first)

| File                                            | Role                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/state/logic/storage/index.ts`              | Boot: open Dexie, read every table, dispatch `setFromIndexedDB`, run `handleMigrationsAndUpdates`, then two-way sync (Redux → IDB via `subscribeToDataUpdates`, IDB → Redux via `dexie-observable` change events tagged with a per-tab uuid). Returns a `StorageState` (`loaded` / `empty` / `unavailable` / `unreadable`). |
| `src/state/logic/storage/database.ts`           | Dexie schema: database `TopHatDatabase`, version 2 (IndexedDB version 20), one table per `DataKeys` entry, `transaction` stored as `transaction_`.                                                                                                                                                                  |
| `src/state/logic/storage/migrations.ts`         | `handleMigrationsAndUpdates(generation)` — data migrations keyed off `user.generation`; current generation is 5.                                                                                                                                                                                                  |
| `src/state/logic/storage/rescue.ts`             | Raw-IndexedDB reader for a database Dexie refuses to open; feeds the "Data Could Not Be Read" screen in `src/app/storage.tsx`.                                                                                                                                                                                    |
| `src/state/logic/storage/types.ts`              | `StorageState` union, held in the `app` slice as `state.app.storage`.                                                                                                                                                                                                                                             |
| `src/state/logic/dropbox.ts`                    | PKCE OAuth by full-page redirect to `${origin}/TopHat/dropbox`, refresh token kept in `user.dropbox` (inside the synced data!), and an upload-only backup of the whole data slice as `/data.zip` on every change.                                                                                                    |
| `src/state/logic/startup.ts`                    | `initialiseAndGetDBConnection`: reads the `?code=` before any Redux action can rewrite the URL, boots storage, sets up notifications, Dropbox, currency sync.                                                                                                                                                       |
| `src/state/logic/notifications/variants/idb.tsx`, `dropbox.tsx` | The "Data Save Failed" and "Dropbox Sync Failed" notifications.                                                                                                                                                                                                                                                  |
| `src/dialog/settings/storage.tsx`               | The Cloud Data Storage settings page: Link Account / name + email + Remove.                                                                                                                                                                                                                                       |
| `src/state/app/index.ts`                        | `getAppStateFromPagePath` maps the `/TopHat/dropbox` path to the storage settings dialog; the reducer wrapper pushes to `window.history` on every action, which is why the code had to be read before any dispatch.                                                                                              |
| `src/state/data/index.ts`                       | `setFromIndexedDB(ListDataState)` reducer (suppresses the patch and the toast), `subscribeToDataUpdates`, `removeDropoxSync`, `updateUserPartial`, `updateNotificationState`.                                                                                                                                       |
| `src/main.tsx`                                  | Calls `initialiseAndGetDBConnection()` then renders; registers the PWA service worker.                                                                                                                                                                                                                             |
| `vite.config.ts`                                | `VitePWA` with `workbox.globPatterns` — the service worker's navigation fallback matters for the popup (see gotchas).                                                                                                                                                                                              |
| `src/state/logic/storage/database.testing.ts`   | Raw-IndexedDB fixtures and read/write helpers for the legacy schema (`CurrentSchema` = v20, `SchemaBeforePatches` = v10), `getSavedData()`, `OldSavedData` (every optional field filled in, including a Dropbox token).                                                                                             |
| `src/state/logic/storage/index.test.ts`         | Loading-and-saving tests; boots the whole app via `vi.resetModules()` + `initialiseAndGetDBConnection()`.                                                                                                                                                                                                         |
| `src/state/logic/storage/database.test.ts`      | Checks the test helpers against Dexie. Its header says it goes when Dexie does.                                                                                                                                                                                                                                   |

Two known bugs in the current layer are pinned by commented-out tests in `index.test.ts` and should
simply disappear with this migration (whole-state writes): the first save of a session never
deletes rows, and migrated state is not saved unless the user later changes something. Uncomment
those tests when the new layer is in.

## 3. PSW in one page (what the agent needs to know)

Source: `../personal-storage-wrapper/personal-storage-wrapper/src/`. Entry `main.ts` re-exports
`manager/` and `targets/`. Read `manager/manager.ts`, `manager/startup/constructor.ts`,
`manager/startup/resolver.ts`, `manager/operations/*.ts`, `manager/utilities/defaults.ts`,
`targets/indexeddb/target.ts`, `targets/dropbox/*.ts`, `targets/utils.ts`.

-   `PersonalStorageManager.create(defaultInitialValue, config)` → `Promise<PSM>`. `defaultInitialValue`
    may be `V`, `() => V` or `() => Promise<V>` and is **only** evaluated when every sync is empty or
    failed. This is the hook for the legacy fallback.
-   Config (all optional): `id` (BroadcastChannel name + duplicate guard), `getSyncData`/`saveSyncData`
    (serialised sync list — default localStorage key `personal-storage-manager-state`; **contains
    Dropbox refresh tokens**), `getDefaultSyncs`, `pollPeriodInSeconds` (`null` disables polling),
    `onValueUpdate(value, origin)` with origin `CREATION | LOCAL | BROADCAST | REMOTE | CONFLICT`,
    `onSyncStatesUpdate(syncs)`, `handleSyncOperationLog({sync, operation: POLL|UPLOAD|DOWNLOAD, stage: START|SUCCESS|OFFLINE|ERROR})`,
    `handleAllEmptyAndFailedSyncsOnStartup(results)`, `resolveConflictingSyncValuesOnStartup(original, current, syncsWithValues)`,
    `resolveConflictingSyncsUpdate(local, syncs, conflicts)`, `ignoreDuplicateCheck`.
-   Startup: reads every sync in parallel; the **first non-null value resolves `create()`**
    ("provisional"), and conflict resolution against the remaining syncs happens afterwards and may
    fire `onValueUpdate(value, "CONFLICT")`. If all syncs are empty, `defaultInitialValue` is used and
    **immediately written to every empty sync**. Winner of a startup conflict is written to the losers.
-   Default startup resolver (`resolveStartupConflictsWithRemoteStateAndLatestEdit`): prefers non-null,
    then **any remote target over IndexedDB regardless of timestamp**, then newest timestamp.
-   Default update resolver (`resolveUpdateConflictsWithRemoteStateAndLatestEdit`): **keeps the local
    value** and writes it over the remote. `addTarget` uses this — so linking Dropbox on a fresh
    install would overwrite the backup with the empty tutorial state.
-   `setValue(v)` stores, notifies `onValueUpdate(v, "LOCAL")`, broadcasts the whole value to other
    tabs, and enqueues a write. Queued writes collapse into one, so bursts are already coalesced.
-   `addTarget(target)`, `removeSync(sync)`, `getSyncsState()`, `getValue()`, `poll()`.
-   `IndexedDBTarget.create(id?)`: database `personal-storage-wrapper`, version 1, object store
    `stores`, rows `{ id, buffer: ArrayBuffer, timestamp: Date }`. `id` defaults to a random 6-char
    string. Values are gzip-compressed JSON when `compressed: true` (the default for `addTarget` and
    `getDefaultSyncStates`); uses `CompressionStream` when present, else lazily imports `fflate`.
-   `DropboxTarget.setupInPopup(clientId, redirectURI, path)` → `Promise<DropboxTarget | null>` (null
    if the popup is blocked, closed, or lands on a URL whose part before `?` is not exactly
    `redirectURI`). `DropboxTarget.deserialise({ connection: { clientId, refreshToken, accessToken, expiry }, user: { id, email, name }, path })`.
    Instances expose `user`, `path`, `fetchJSON(url, init)` (auth + refresh handled), `delete()`.
    File read/write is the raw buffer at `path` in the app folder.
-   `getFromPopup` (`targets/utils.ts`) polls the popup every 50 ms and resolves at the **first**
    moment the popup is same-origin. Anything that lands on the same origin at a different path
    resolves `null` and closes the popup.
-   No `close()`/`destroy()` on the manager. Polling reschedules itself every 10 s forever, even when
    `pollPeriodInSeconds` is `null` (it just does nothing).

### Library defects found while reading it (fix in PSW first — Phase 0)

1. **Polling always re-downloads.** `manager/operations/poll.ts` line 26 compares
   `timestamp.value === sync.lastSeenWriteTime` — reference equality on `Date` objects. Real targets
   return a fresh `Date` per call, and after a reload `lastSeenWriteTime` is an ISO string from
   `JSON.parse`, so every poll reads and decompresses every target (a full Dropbox download every
   10 s). Fix: compare `valueOf()`s, and revive `lastSeenWriteTime` to a `Date` in
   `manager/utilities/serialisation.ts` `getSyncsFromConfig`. Add a test with a target that returns a
   new `Date` object each call.
2. **`IndexedDBTarget.create` never registers `onversionchange`**, so a connection blocks any
   `deleteDatabase`/upgrade from another tab (and from test teardown) forever. Add
   `db.onversionchange = () => db.close()` and set `this.db = null` afterwards so later operations
   return `OFFLINE` rather than throwing.
3. **`IndexedDBTarget.create` throws instead of resolving `null`** if `window.indexedDB.open` throws
   (some private modes define `indexedDB` but throw on `open`). Wrap the `open` call in `try/catch`
   → `resolve(null)`.
4. Minor: `targets/dropbox/auth.ts` `runAuthInPopup` compares the popup URL against the raw
   `redirectURI` argument rather than `definiteRedirectURI`, so `setupInPopup` without an explicit
   redirect URI always resolves `null`. TopHat always passes one; fix it anyway (one-word change).
5. Optional but recommended: `PersonalStorageManager.close()` that clears the poll timer and closes
   the `BroadcastChannel`, plus a `closed` flag that makes further operations no-ops. Tests in TopHat
   will otherwise accumulate live managers across boots.

Each fix gets its own test in the PSW repo (`yarn test` there uses vitest with jsdom and
`fake-indexeddb`). Commit to a branch in `../personal-storage-wrapper`; TopHat pins that commit.

## 4. Decisions

Made here; proceed on these unless Henry says otherwise.

| Topic                      | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dependency mechanism       | PSW is not on npm and Henry does not want to publish it. Its git repo is a yarn-workspaces root whose package has `"exports": "./src/main.ts"` (TypeScript source, no build). Use a git dependency pinned to a commit: `"personal-storage-wrapper": "github:Athenodoros/personal-storage-wrapper#<sha>"`, add `fflate` as a direct TopHat dependency (yarn will not install the nested workspace's deps), and resolve the import through an alias in `vite.config.ts` (`resolve.alias`), `vitest.config.ts` (`test.alias`) and `tsconfig.json` (`baseUrl` + `paths`) pointing at `node_modules/personal-storage-wrapper/personal-storage-wrapper/src/main.ts`. Also add `personal-storage-wrapper` to vitest `server.deps.inline` so the `.ts` source is transformed and `vi.resetModules()` gives each test boot a fresh copy of the library. CI (`.github/workflows/main.yml`) needs no change. **Ask Henry** if he would rather use a git submodule or `file:` link; either works with the same alias. |
| Stored value               | The PSW value is a `ListDataState` (the arrays that `DataSlice.actions.setFromIndexedDB` already accepts), in `DataKeys` order, compressed. No extra envelope: `user.generation` remains the schema version, and `handleMigrationsAndUpdates` keeps running on it.                                                                                                                                                                                                                                                                                       |
| Store identity             | PSM `id: "tophat"`. Default syncs: one `IndexedDBTarget.create("tophat")`, `compressed: true`. Sync config in localStorage under `tophat-syncs` (pass `getSyncData`/`saveSyncData`). A fixed target id means the data is always findable even if localStorage is wiped, and tests and the rescue screen can read it directly: database `personal-storage-wrapper`, store `stores`, key `tophat`.                                                                                                                                                       |
| Legacy database            | Read once, on boot, via the raw IndexedDB API (no version number, so any Dexie schema version opens), only when the new store is empty. Never written to. Deleted per the rule in §5.4.                                                                                                                                                                                                                                                                                                                                                                  |
| Migration record           | localStorage key `tophat-legacy-migration`, value `{ "migratedAt": "<ISO datetime>", "boots": <n> }`. Written when legacy data is copied into the new store. `boots` counts boots that loaded from the new store.                                                                                                                                                                                                                                                                                                                                          |
| Polling                    | `pollPeriodInSeconds: null` for this migration. TopHat never polled Dropbox before; cross-tab sync is handled by `BroadcastChannel`, not polling. Revisit after Phase 0 fix 1 is in.                                                                                                                                                                                                                                                                                                                                                                       |
| Startup conflict resolver  | Custom: choose the candidate with the **latest timestamp** (IndexedDB write time vs Dropbox `server_modified`); tie → remote. The library default would let a stale Dropbox copy overwrite offline edits on the next boot.                                                                                                                                                                                                                                                                                                                             |
| Update conflict resolver   | Custom: if the local value is a fresh install (`user.tutorial === true`) take the remote value; otherwise keep local (this is what old TopHat did on link: the browser's data overwrites the backup).                                                                                                                                                                                                                                                                                                                                                    |
| Dropbox file               | New path `/data.json.gz` (gzip JSON written by PSW). The old `/data.zip` is left alone.                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Dropbox app + redirect URI | Keep TopHat's app key `7ru69iyjvo0wz6t`. The popup must land on a **static same-origin page that is served without redirects**: add `public/dropbox.html` and use redirect URI `${window.location.origin}/TopHat/dropbox.html`. **Henry must add** `https://athenodoros.github.io/TopHat/dropbox.html` and `http://localhost:5173/TopHat/dropbox.html` to the app's redirect URIs in the Dropbox App Console before the popup flow can be tested end to end. See gotcha G1 for why the old `/TopHat/dropbox` path is not safe.                                       |
| Legacy Dropbox token       | Migrate it automatically on the first boot that has a `user.dropbox` spec and no Dropbox sync: build a `DropboxTarget` from the refresh token, fetch the account id, `addTarget`, then clear `user.dropbox`. If offline, leave the spec for next boot. If the token is rejected, clear the spec and raise the existing "Dropbox Sync Failed" notification (its button already opens the storage settings page, where the user can re-link).                                                                                                                 |
| Fresh installs write       | PSM writes the default (tutorial) state to the store as soon as it is created. Old TopHat wrote nothing until the first change. Accept this; update the one test that asserts otherwise.                                                                                                                                                                                                                                                                                                                                                                  |
| Unreadable data            | A stored `user.generation` greater than the app's `CURRENT_GENERATION` (export it from `migrations.ts`, currently 5) is "unreadable": show the existing recovery screen, wire nothing that writes. This replaces the Dexie "newer schema version" case, which the raw legacy reader no longer hits.                                                                                                                                                                                                                                                       |

## 5. Target design

### 5.1 Module layout (`src/state/logic/storage/`)

-   `manager.ts` — creates and holds the single `PersonalStorageManager<ListDataState>`. Exports
    `createStorageManager(hooks)`, `getStorageManager()`, the constants (`STORAGE_ID = "tophat"`,
    `SYNC_CONFIG_KEY = "tophat-syncs"`), the two conflict resolvers, and `toListDataState(DataState)`.
-   `legacy.ts` — `readLegacyDatabase(): Promise<ListDataState | null>` (raw IndexedDB, moved from
    `rescue.ts`'s `readDatabaseContents`; maps store names back through the `transaction_` rename;
    returns `null` when there is no `user` row; if the open created an empty database because none
    existed, close it and delete it again), `getMigrationRecord`/`setMigrationRecord`,
    `recordBootAndMaybeDeleteLegacyDatabase()`, `deleteLegacyDatabase()`, `LEGACY_DATABASE_NAME`.
-   `dropbox.ts` (replaces `src/state/logic/dropbox.ts`) — `DROPBOX_APP_KEY`, `DROPBOX_REDIRECT_URI`,
    `DROPBOX_PATH`, `linkDropboxInPopup(): Promise<boolean>`, `unlinkDropbox(sync)`,
    `migrateLegacyDropboxToken()`, `isDropboxSync(sync)`.
-   `index.ts` — `setupStorageAndLoadData(debug): Promise<{ manager, storage: StorageState }>`, the boot
    sequence in §5.2 and the Redux ↔ PSM wiring in §5.3.
-   `rescue.ts` — keep the download/delete surface used by `src/app/storage.tsx`, but the data now comes
    from the value the manager loaded (plus any legacy rows), and `deleteDatabase` becomes
    `deleteAllStoredData()`: clear the `tophat` row from the PSW store, delete `TopHatDatabase`, remove
    `tophat-syncs` and `tophat-legacy-migration` from localStorage.
-   `migrations.ts` — unchanged apart from exporting `CURRENT_GENERATION`.
-   `types.ts` — unchanged.
-   `database.ts` — deleted. `database.test.ts` — replaced (see §6).

### 5.2 Boot sequence (`setupStorageAndLoadData`)

```
1. flags: usedDefault = false, loadedFromLegacy = false, idbFailed = false, idbError = ""
2. manager = await PersonalStorageManager.create(
       async () => {                       // only runs if the new store is empty
           usedDefault = true;
           const legacy = await readLegacyDatabase().catch(() => null);
           if (legacy) { loadedFromLegacy = true; return legacy; }
           return toListDataState(initialTutorialState);   // export it from data/index.ts
       },
       {
           id: "tophat",
           getSyncData: () => localStorage.getItem("tophat-syncs"),
           saveSyncData: (s) => localStorage.setItem("tophat-syncs", s),
           getDefaultSyncs: async () => [{ target: await IndexedDBTarget.create("tophat"), compressed: true }],
           pollPeriodInSeconds: null,
           handleAllEmptyAndFailedSyncsOnStartup: async (results) => {
               if (results.some(r => r.sync.target.type === "indexeddb" && r.value.type === "error")) idbFailed = true;
               return { behaviour: "DEFAULT" };
           },
           resolveConflictingSyncValuesOnStartup: latestTimestampWins,
           resolveConflictingSyncsUpdate: remoteWinsOverFreshInstall,
           onValueUpdate: (value, origin) => { if (origin !== "CREATION" && origin !== "LOCAL") applyValueFromStorage(value); },
           onSyncStatesUpdate: (syncs) => TopHatDispatch(AppSlice.actions.setSyncStates(describe(syncs))),
           handleSyncOperationLog: log => { idb + dropbox notification bookkeeping, see §5.5 },
       });
3. value = manager.getValue(); generation = value.user[0]?.generation ?? 0
4. if generation > CURRENT_GENERATION:
       keep the rescue copy (value + legacy rows), setIDBConnectionExists(true),
       return { manager, storage: { type: "unreadable", error: "...written by a newer version...", rescuedRows } }
       (do NOT wire §5.3; do NOT migrate the Dropbox token; do NOT touch the legacy database)
5. TopHatDispatch(DataSlice.actions.setFromIndexedDB(value))   // wrapped in the echo guard, §5.3
6. handleMigrationsAndUpdates(generation)
7. wire Redux → PSM (§5.3). If step 6 changed anything the listener will already have fired; if the
   state is unchanged but loadedFromLegacy, call manager.setValue(...) once anyway so the copy in the
   new store is the migrated one (it was written raw in step 2).
8. legacy bookkeeping:
       if loadedFromLegacy → setMigrationRecord({ migratedAt: now, boots: 1 })
       else if !usedDefault → recordBootAndMaybeDeleteLegacyDatabase()   // §5.4
9. storage = idbFailed ? { type: "unavailable", error } : usedDefault && !loadedFromLegacy ? { type: "empty" } : { type: "loaded" }
   setIDBConnectionExists(!idbFailed)
10. return { manager, storage }
```

`startup.ts` then does what it does today minus every Dropbox line: no `getMaybeDropboxRedirectCode`,
no "silently set up demo on redirect loop", no `dealWithDropboxRedirect`, no
`initialiseMaybeDropboxSyncFromRedux`. After `initialiseNotificationUpdateHook()` and only when
`storage.type !== "unreadable"`, call `migrateLegacyDropboxToken()` (fire and forget). Replace the
`db` debug variable with `manager`.

### 5.3 Redux ↔ PSM wiring

Redux → PSM: `subscribeToDataUpdates((previous, next) => { if (applyingFromStorage) return; setTimeout(() => manager.setValue(toListDataState(TopHatStore.getState().data)), 0); })`.
`toListDataState` builds `{ key: state[key].ids.map(id => state[key].entities[id]) }` for each
`DataKeys` entry — the same shape `setFromIndexedDB` accepts. PSM's write queue collapses bursts, so
no extra debounce; measure with the demo data and add a trailing debounce (≤ 250 ms, flushed on
`pagehide`) only if saves visibly lag.

PSM → Redux (`applyValueFromStorage`): set `applyingFromStorage = true`, dispatch
`setFromIndexedDB(value)`, reset the flag in a `finally`. The flag must be read synchronously in the
listener (before the `setTimeout`), because the listener fires inside the reducer wrapper. Without it,
every broadcast from another tab would be echoed back as a write. The `patches` history travels
inside the value, so `setFromIndexedDB` is right to suppress creating a new patch.

### 5.4 Legacy retention rule (`recordBootAndMaybeDeleteLegacyDatabase`)

Runs only on boots that loaded from the new store. If no record exists, do nothing (either this
install never had legacy data, or the boot that copied it already wrote the record). Otherwise
`boots += 1`, save, and if `boots >= 10 && now - migratedAt >= 14 days`: `indexedDB.deleteDatabase("TopHatDatabase")`,
then remove the record. Ignore a blocked/failed deletion (try again next boot). Deletion must never
run on a boot where `usedDefault` is true.

### 5.5 Notifications and sync state

-   `handleSyncOperationLog`: for `sync.target.type === "indexeddb"`: `stage === "ERROR" || "OFFLINE"` →
    `setIDBConnectionExists(false)`; `SUCCESS` → `true`. For `"dropbox"`: `ERROR` →
    `updateNotificationState({ id: DROPBOX_NOTIFICATION_ID, contents: "" })`; `SUCCESS` → `contents: null`.
    `OFFLINE` for Dropbox is not an error (old code skipped saves offline).
-   `app` slice gains `syncs: { type: "indexeddb" | "dropbox"; name?: string; email?: string; desynced: boolean }[]`
    and `setSyncStates`. `getAppStateFromPagePath`/`setPageStateFromPath` must carry `syncs` through
    the same way they carry `storage`.
-   `src/dialog/settings/storage.tsx` reads `state.app.syncs` instead of `user.dropbox`; `Link Account`
    calls `linkDropboxInPopup()` (local `loading` state while the popup is open; if it resolves `false`,
    show a snack via `setPopupAlert` saying the popup was blocked or closed); `Remove` calls
    `unlinkDropbox`. Delete `DataSlice.actions.removeDropoxSync` only if nothing else references it
    (`DropboxSpec`/`User.dropbox` stay in the types: old data still carries them).
-   `DropboxNotificationDefinition` and `IDBNotificationDefinition` are unchanged.

### 5.6 Dropbox

`linkDropboxInPopup`: `const target = await DropboxTarget.setupInPopup(DROPBOX_APP_KEY, DROPBOX_REDIRECT_URI, DROPBOX_PATH); if (!target) return false; await manager.addTarget(target); return true;`
The addition operation reads `/data.json.gz`; if absent it writes the current value; if present and
different, `remoteWinsOverFreshInstall` decides.

`migrateLegacyDropboxToken`: read `user.dropbox` from the store; skip unless it is an object and
`manager.getSyncsState()` has no dropbox sync. `DropboxTarget.deserialise({ connection: { clientId: DROPBOX_APP_KEY, refreshToken, accessToken: "", expiry: "1970-01-01T00:00:00.000Z" }, user: { id: "", email, name }, path: DROPBOX_PATH })`,
then `target.fetchJSON<{ account_id, email, name: { display_name } }>("https://api.dropboxapi.com/2/users/get_current_account", { method: "POST" })`.
On `type: "value"`: deserialise again with the real user, `addTarget`, `updateUserPartial({ dropbox: undefined })`.
On `error: "OFFLINE"` or `"UNKNOWN"`: leave everything, retry next boot. On `"INVALID_AUTH"`:
`updateUserPartial({ dropbox: undefined })` and raise the Dropbox notification.

`public/dropbox.html`: a static page with the text "Signing in to Dropbox… you can close this window
if it does not close itself." No scripts. It exists only so the popup lands on a same-origin URL that
needs no redirect and does not boot the app.

`src/main.tsx` guard, before anything else runs: `if (window.location.pathname.endsWith("/dropbox.html")) { document.body.textContent = "…"; } else { boot as today }`.
This protects against the service worker serving `index.html` for that URL (gotcha G1).

`vite.config.ts`: `workbox.navigateFallbackDenylist: [/\/dropbox\.html/]`.

## 6. Tests (Vitest)

Keep the three-file split. Everything reads/writes IndexedDB and localStorage directly.

### `database.testing.ts` (extend, do not rewrite)

Keep every existing export (the legacy schema writer and fixtures are now the legacy seeding
mechanism). Add:

-   `STORE_DATABASE_NAME = "personal-storage-wrapper"`, `STORE_KEY = "tophat"`, `SYNC_CONFIG_KEY`,
    `MIGRATION_RECORD_KEY`.
-   `readFromStore(): Promise<ListDataState | null>` — open v1, get `stores`/`tophat`, gunzip with
    `node:zlib` (`gunzipSync(Buffer.from(buffer))`), `JSON.parse`, `sortLists`. Missing row → `null`.
-   `writeToStore(data: Partial<ListDataState>)` — gzip with `node:zlib`, put `{ id: "tophat", buffer, timestamp: new Date() }`
    (create the store on `upgradeneeded`).
-   `clearStore()` — clear the `stores` object store rather than deleting the database (open manager
    connections would block a delete; see G8). Also `localStorage.clear()`.
-   `legacyDatabaseExists(): Promise<boolean>` — `indexedDB.databases()` under fake-indexeddb, falling
    back to open-without-version + `objectStoreNames.length > 0` (and delete-if-created).
-   `setMigrationRecord(record | null)` / `getMigrationRecord()`.
-   Rename `deleteDatabase` → `deleteLegacyDatabase` (the legacy database is still deleted between tests).

Check first that `fake-indexeddb/auto` satisfies PSW's `"indexedDB" in window` check under
vitest's jsdom environment (PSW's own tests do exactly this, so it should).

### `database.test.ts` (replace)

Same purpose as today: prove the helpers describe the real thing. Three tests:

1. `writeToStore` produces a row that `IndexedDBTarget.create("tophat")` + `read()` returns, and
   that decompresses (via PSW's own `getValueFromBuffer`, or a tiny manager) to the fixture.
2. `readFromStore` reads what a `PersonalStorageManager` with the default syncs wrote after `setValue`.
3. `readLegacyDatabase()` returns `sortLists(getSavedData())` for a database written with
   `CurrentSchema`, the same for `SchemaBeforePatches`, and `null` when there is no database — and
   leaves no empty `TopHatDatabase` behind in the last case.

### `index.test.ts` (edit)

Boot helper stays as is (`vi.resetModules()` + `initialiseAndGetDBConnection()`); drop the
`../dropbox` mock, keep the `../currencies` mock, and stub `fetch` (`vi.stubGlobal`) so no Dropbox
request escapes. `afterEach`: `pause(25)`, `clearStore()`, `deleteLegacyDatabase()`.

Update existing tests:

-   "starts in the tutorial state … saves nothing" → "starts in the tutorial state when there is
    nothing saved": `storage()` is `{ type: "empty" }`, and the store now holds the tutorial state
    (`readFromStore()` equals `asLists(data())`).
-   "saves the whole state the first time anything changes", "saves changes, and loads them again on
    the next boot", "loads saved data", "migrates data saved by an older version of the app" (now
    **uncomment** the `waitFor` — migrations are persisted), "loads every field of data saved months
    ago": seed with `writeToStore(...)` instead of `writeToDatabase(...)`, read with `readFromStore()`.
-   "upgrades a database written against the older schema" → becomes a legacy test (below).
-   "keeps data that it cannot read": seed `writeToStore(getSavedData({ generation: CURRENT_GENERATION + 1 }))`;
    expect `unreadable`, tutorial state in Redux, store unchanged after a dispatch.
-   Uncomment "saves a deletion that is the first change of a session".

Add (legacy and sync mechanisms, one test each):

-   "loads data left by the Dexie version, copies it into the new store, and leaves the original":
    `writeToDatabase(OldSavedData)` (this is the fixture with every optional field), boot → `loaded`,
    every field assertion from the "months ago" test holds, `readFromStore()` equals `asLists(data())`,
    `readFromDatabase()` still equals `sortLists(OldSavedData)`, migration record is `{ boots: 1, migratedAt: <recent> }`.
-   "reads a legacy database written against the older schema": `writeToDatabase(getSavedData({ generation: 4 }), SchemaBeforePatches)`
    → boots, generation 5, store written.
-   "prefers the new store to the legacy database": seed both with different references → Redux and
    store show the new one; legacy untouched.
-   "deletes the legacy database after fourteen days and ten boots, and not before": seed both stores,
    `setMigrationRecord({ migratedAt: 20 days ago, boots: 8 })`, boot → record boots 9, legacy exists;
    boot → legacy gone, record removed. Then the negative: `{ migratedAt: 2 days ago, boots: 9 }` →
    boot → still exists.
-   "picks up a change made in another tab": boot A, boot B (both stay alive; Node's global
    `BroadcastChannel` connects them), dispatch a change in A, `waitFor` B's Redux state to match,
    and `readFromStore()` to match. Requires PSW to be inlined so `vi.resetModules()` gives B its own
    module instance (otherwise the duplicate-id guard throws — if so, pass `ignoreDuplicateCheck: true`
    only when `import.meta.env.MODE === "test"`).
-   "turns a saved Dropbox token into a sync target": seed `writeToStore(getSavedData({ dropbox: { refreshToken: "r", name: "N", email: "e@x" } }))`;
    `fetch` stub answers `oauth2/token` (refresh), `users/get_current_account`, `files/get_metadata`
    (path not found error_summary), `files/upload` (`server_modified`); boot → `waitFor` a dropbox
    sync in `state.app.syncs` with `email: "e@x"`, `user.dropbox` undefined, and `tophat-syncs` in
    localStorage containing `"refreshToken":"r"`. A second boot makes no `get_current_account`
    request.
-   "leaves a saved Dropbox token alone when offline": `navigator.onLine` stubbed false → no fetch
    calls, `user.dropbox` still set.

Do not add tests for the popup itself, GDrive, or polling.

Run: `yarn test src/state/logic/storage` (first boot in a file takes ~30 s; leave the collection-time
warm-up in place).

## 7. Playwright MCP paths (manual/agent-driven verification)

Start the app with `yarn dev` (serves `http://localhost:5173/TopHat/`). Use the `mcp__playwright__*`
tools: `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_evaluate`, `browser_tabs`,
`browser_run_code_unsafe`. Each path starts from a fresh browser context unless stated. Snippets for
`browser_evaluate` below are illustrative; adapt fixture data from `database.testing.ts` (the
`getSavedData()` shape) into plain JS.

Helper snippets:

```js
// read the new store
await new Promise((res) => { const r = indexedDB.open("personal-storage-wrapper"); r.onsuccess = () => {
  const g = r.result.transaction("stores").objectStore("stores").get("tophat"); g.onsuccess = () => res(g.result ? g.result.buffer.byteLength : null); }; });
// does the legacy database exist
(await indexedDB.databases()).map((d) => d.name);
// seed a legacy database (Dexie IndexedDB version 20, keyPath "id" on every store)
await new Promise((res, rej) => { const r = indexedDB.open("TopHatDatabase", 20);
  r.onupgradeneeded = () => ["user","account","category","currency","institution","rule","transaction_","statement","notification","patches"]
    .forEach((n) => r.result.createObjectStore(n, { keyPath: "id" }));
  r.onsuccess = () => { const tx = r.result.transaction(Object.keys(ROWS), "readwrite");
    Object.entries(ROWS).forEach(([store, rows]) => rows.forEach((row) => tx.objectStore(store).put(row)));
    tx.oncomplete = () => { r.result.close(); res(); }; tx.onerror = () => rej(tx.error); }; });
```

1.  **Fresh install and persistence.** Navigate → tutorial overlay visible → click "Begin Demo" →
    summary shows demo accounts → reload → still the demo, no tutorial → evaluate: store row exists,
    `TopHatDatabase` not in `indexedDB.databases()`, localStorage has `tophat-syncs` and no
    `tophat-legacy-migration`.
2.  **Legacy migration.** Fresh context, navigate once (so the origin exists), evaluate the legacy seed
    with a user row `{ id: 0, generation: 5, tutorial: false, isDemo: false, currency: 1, … }` and one
    account named `Legacy Cheque` → reload → navbar/accounts page shows `Legacy Cheque` → evaluate:
    store row exists, `TopHatDatabase` still listed, migration record `{ boots: 1 }`.
3.  **New store preferred.** Continue from 2: evaluate a change to the legacy account's name → reload
    → UI still shows `Legacy Cheque`.
4.  **Legacy deletion rule.** Continue: set the record to `{ migratedAt: <20 days ago>, boots: 9 }` →
    reload → `TopHatDatabase` gone, record removed. Repeat from 2 with `{ boots: 2 }` → still present.
5.  **Cross-tab sync.** Two tabs on the app (`browser_tabs` new). In tab 1 rename an account; switch to
    tab 2 → snapshot shows the new name without reloading. Reload tab 2 → still the new name.
6.  **Unreadable data.** Evaluate: write a store row whose JSON has `user: [{ …, generation: 99 }]`
    (compress in-page with `new CompressionStream("gzip")`) → reload → "Data Could Not Be Read" screen
    → evaluate: store buffer length unchanged → click "Delete Data and Restart" twice → tutorial;
    evaluate: legacy database absent, localStorage keys removed.
7.  **Storage unavailable.** `browser_run_code_unsafe` with `context.addInitScript` that replaces
    `indexedDB.open` with a function returning a request object whose `onerror` fires on a timeout →
    navigate → tutorial loads and the "Data Save Failed" notification is in the notifications panel;
    app is usable (add an account) without console errors.
8.  **Dropbox link, cancelled.** Settings → Cloud Data Storage → "Link Account" → `browser_tabs` lists
    a new page at `dropbox.com` → close it → the settings page returns to "Link Account" with a snack,
    no spinner stuck, no console errors.
9.  **Redirect page does not boot the app.** Navigate directly to
    `/TopHat/dropbox.html?code=test` → page shows the sign-in text, no navbar; evaluate: no
    `tophat-syncs` in localStorage, no store row. Repeat after the service worker has installed (visit
    `/TopHat/` first, wait, then navigate) — same result.
10. **Legacy Dropbox token, rejected.** Seed a legacy database whose user has
    `dropbox: { refreshToken: "invalid", name: "X", email: "x@y" }` → reload → within a few seconds the
    "Dropbox Sync Failed" notification appears; Cloud Data Storage shows "Link Account";
    evaluate: `tophat-syncs` has no dropbox entry. (Needs network access to dropboxapi.com.)
11. **Real Dropbox, manual (Henry).** After the redirect URIs are registered: link an account,
    confirm `Apps/TopHat/data.json.gz` appears in Dropbox and updates after an edit; then in a fresh
    browser profile link the same account → the data appears (remote wins over the tutorial state);
    edit offline in one profile, go online, reload → the edit survives and reaches Dropbox.

## 8. Phases and order of work

Each phase leaves `yarn build` and `yarn test` green.

**Phase 0 — PSW fixes** (in `../personal-storage-wrapper`, own branch): §3 defects 1–4 (+5 if cheap),
each with a test. Note the commit sha.

**Phase 1 — Dependency and store, no Dropbox.** Add the dependency + aliases + `fflate`; write
`manager.ts`, `legacy.ts`, new `index.ts`, `rescue.ts` changes, `migrations.ts` export, `main.tsx`
guard, `app` slice `syncs`; delete `database.ts`; remove `dexie`, `dexie-observable` and the
`dexie-observable` alias in `vitest.config.ts`; keep `src/state/logic/dropbox.ts` compiling but
unused (or stub it) so the settings page still renders. Tests: everything in §6 except the two
Dropbox-token tests. Playwright paths 1–7 and 9.

**Phase 2 — Dropbox.** `storage/dropbox.ts`, settings page, notification wiring, token migration,
`public/dropbox.html`, workbox denylist; delete `src/state/logic/dropbox.ts`. Tests: the two
Dropbox-token tests. Playwright paths 8, 10; ask Henry to run 11.

**Phase 3 — Clean-up.** `jszip` stays (used by the export dialog). Remove the `dropbox` branch from
`getAppStateFromPagePath` only if Henry agrees (it is a harmless deep link). Update `AGENTS.md`'s
persistence paragraphs to describe the new layer. Update memory notes.

## 9. Gotchas (read twice)

-   **G1 — the popup must land on a static same-origin page.** `getFromPopup` resolves on the first
    same-origin poll and closes the popup. On GitHub Pages the old `/TopHat/dropbox` path is served by
    `public/404.html`, which bounces through `/TopHat/?/dropbox&code=…` before `index.html` rewrites
    the URL back — the poller can catch the bounce URL, see a path mismatch, resolve `null` and close
    the popup. Separately, the PWA service worker's `navigateFallback` serves `index.html` for any
    navigation not in the precache, and a `?code=` query means `dropbox.html` is *not* matched from
    the precache — hence the `navigateFallbackDenylist` and the `main.tsx` guard. Vite's dev server
    serves `public/dropbox.html` at `/TopHat/dropbox.html` directly.
-   **G2 — echo loop.** Applying a value from storage dispatches `setFromIndexedDB`, which fires the
    data listeners, which would call `setValue` and broadcast back. Use the synchronous guard flag in
    §5.3. Also never call `setValue` with the value you just received.
-   **G3 — `create()` resolves early.** The manager returns as soon as one sync has a value; the
    conflict pass happens afterwards and can call `onValueUpdate(…, "CONFLICT")`. Wire
    `onValueUpdate` in the creation config, not after.
-   **G4 — the default resolvers lose data.** Startup default prefers remote over local regardless of
    age (stale Dropbox overwrites offline edits); update default prefers local (linking on a fresh
    install overwrites the backup with the tutorial state). Both are replaced in §4.
-   **G5 — legacy open creates a database.** `indexedDB.open(name)` with no version creates an empty
    database if none exists. Check `objectStoreNames` and delete what you created, or every later
    "does the legacy database exist" check answers yes.
-   **G6 — refresh tokens move to localStorage** (`tophat-syncs`). That is an improvement (they used to
    be inside the synced data itself), but "Delete Data and Restart" and the rescue screen must clear
    that key too, and the debug export must not include it.
-   **G7 — `user.dropbox` stays in the type.** Old values and old Dropbox backups carry it; a
    `"loading"` string is also possible. Treat anything that is not an object as absent.
-   **G8 — open connections block deletes.** PSW keeps its IndexedDB connection open; without
    Phase 0 fix 2 a `deleteDatabase("personal-storage-wrapper")` never completes (fake-indexeddb
    honours `blocked`). Tests clear the object store instead of deleting the database.
-   **G9 — module identity in tests.** `vi.resetModules()` only re-evaluates modules vitest
    transforms. The PSW dependency must be inlined (`server.deps.inline`) or the second boot in a
    test file hits the duplicate-id guard and the first boot's manager keeps receiving broadcasts.
-   **G10 — no Dropbox code in the boot path.** With the popup flow there is nothing to read from the
    URL, so the "read `?code=` before the first dispatch" dance in `startup.ts` goes away entirely.
    Do not keep a redirect-based fallback.
-   **G11 — `navigator.onLine`.** Every Dropbox request short-circuits to `OFFLINE` when it is false
    (jsdom reports `true`). The token migration must treat `OFFLINE` as "try again later", not as a
    bad token.
-   **G12 — first write on a fresh install.** PSM writes the tutorial state immediately. The
    `storage.type === "empty"` signal now comes from the `usedDefault` flag, not from the store being
    empty after boot.
-   **G13 — private-mode detection.** `IndexedDBTarget.create` swallows `open` errors into a null
    `db`, after which every operation returns `OFFLINE`; the only signal is
    `handleAllEmptyAndFailedSyncsOnStartup` on boot and `ERROR`/`OFFLINE` log stages afterwards.

## 10. Definition of done

-   `yarn build` passes (tsc + vite) and `yarn test` passes, including the previously commented-out
    tests and every new test in §6.
-   `dexie` and `dexie-observable` are gone from `package.json` and `yarn.lock`; `fflate` and the
    pinned `personal-storage-wrapper` are in.
-   Playwright paths 1–10 done by the agent with results recorded in the PR description; path 11
    handed to Henry with the exact redirect URIs to register.
-   `AGENTS.md` persistence section updated; `docs/personal-storage-wrapper-migration.md` (this file)
    updated with anything that turned out differently.


## 11. What turned out differently (written after the work)

The shape of the plan held. These are the departures worth knowing about.

### Three more library defects, found by running it

§3 listed four, plus the optional `close()`. Five more turned up, all on the same branch:

5.  **`deepEquals` walked into anything.** A sync holds a target, and a target holds a database
    connection. Comparing two syncs walked the connection - which under `fake-indexeddb` refers back
    to itself and overflowed the stack, and in a browser said two different targets were the same
    because their outsides matched. Two dates also always compared equal, having no own properties.
    Now anything that is not an array or a plain object is compared by identity, and dates by time.
6.  **`IndexedDBTarget.create` resolved before the database was usable**, out of `onupgradeneeded` on
    a `setTimeout`. The first read of a database that did not exist yet threw `InvalidStateError`,
    and because `Result`'s executor rejects rather than resolving an error, the manager's `create`
    simply never returned: a blank page on every first boot. `Result` now turns a synchronous throw
    into `UNKNOWN`, so a failure like this reports itself instead of hanging. The library's own tests
    had been papering over this with an artificial wait, which is gone.
7.  **`desynced` was persisted and restored.** A desynced sync is never written to again, and only a
    poll or a conflict clears it - so with `pollPeriodInSeconds: null` one failed write stopped the
    app saving at all, permanently, across reloads, and silently, because nothing was attempted so
    nothing failed. This is the one to keep in mind if polling is revisited. A session now starts
    willing to write again.

The library also needed a `name` and `version` in its workspace-root `package.json`: yarn refuses a
git dependency without them. The root is named `personal-storage-wrapper-repo`, which does not clash
with the workspace of the same name, and yarn installs it under the dependency key regardless.

### Changes to the target design

-   `onSyncStatesUpdate` also reports a desynced IndexedDB target as a save failure. Otherwise a
    within-session desync drops every save with nothing on screen to say so, because the notification
    only fires off a logged write failure and a skipped write logs nothing.
-   `vitest.setup.ts` replaces `BroadcastChannel` with an in-process implementation. §6 assumed Node's
    global would connect two boots; under jsdom it throws on every message, because Node's
    `EventTarget` checks its `MessageEvent` against whatever `Event` is global.
-   `database.test.ts` checks the store helpers against a real manager rather than reaching for
    library internals to decompress, and the legacy reader against both schema versions.
-   The unreadable-data message names the generations rather than quoting a Dexie error, which no
    longer exists.

### Verification

Playwright paths 1-10 all pass, path 10 against the live Dropbox API. Path 11 is Henry's, and needs
`https://athenodoros.github.io/TopHat/dropbox.html` and `http://localhost:5173/TopHat/dropbox.html`
registered in the Dropbox App Console (done for the second; confirm the first before release).

Two things to know when running the app locally: the dev server pre-bundles the library out of
`node_modules`, so after re-pinning the dependency `node_modules/.vite` has to go or the old copy is
still served; and the first boot on a clean origin takes a few seconds, so a check that samples
straight after navigation sees a blank page that is not a hang.

## 12. Second pass, 2026-09-10

Henry merged the library branch, re-pinned TopHat to it, and tested the whole thing against a real
Dropbox account. It worked, and turned up three things worth writing down.

### The link flow hung on an account without the right scopes

The Dropbox app had not been given the file scopes, so the download failed - and then every later
attempt to link hung after the token and account requests, for the rest of the session. Three
library defects lined up to do that, all fixed on `hstoke/tophat-dropbox-link-fixes`:

8.  **A 401 was retried forever.** `runDropboxQuery` answered every 401 by forcing a token refresh
    and retrying, which is right for a token that expired early and wrong for a missing scope, where
    every attempt is a 401 however new the token is. It retries once now, and reports the second as
    `INVALID_AUTH`.
9.  **`Result.pmap` did not catch a rejection from its callback.** The rejection went to the derived
    promise `then` builds, which is itself a `Result` and so resolves rejections into errors nobody
    is waiting on, while the `Result` being built was never resolved at all. A download that decoded
    to something other than the expected file left every caller waiting for good.
10. **The manager's operation queue kept `running` set if an operation threw**, so every write,
    addition and poll queued behind it and never ran, and the promises they were handed never
    settled either. It hands the queue back now.

Also there: a malformed buffer made the decompression stream's writer reject with nobody waiting on
it, and `readValueFromTarget` is new - reading a target without adding it to anything, which is what
the link flow below needs.

### Linking is a decision, not an addition

§5.6 treated linking as `addTarget` plus a conflict handler. That is not enough, because by the time
the conflict handler runs the decision to sync is already made, and there are two cases where it
should not have been.

-   **The demo is not disposable data as far as `addTarget` is concerned.** The old check was
    `user.tutorial`, which is cleared before the settings page is reachable at all, so the guard
    never fired: linking from a browser showing the demo wrote the demo over the account. The check
    is now `holdsRealData` in `manager.ts` - not the demo, not the tutorial, and some accounts or
    transactions of the user's own.
-   **Two sets of real data cannot be merged**, so `linkDropboxAccount` reads the account first and
    returns `{ type: "conflict" }` without writing anything. The settings page explains that one
    side has to be cleared before the link can be made.

`data.zip`, which is what versions before the migration backed up, is read when `data.json.gz` is
not there: a zip holding one `data.json` of the normalised store rather than the lists. It is taken
on through `adoptValueFromStorage`, which runs the migrations against it the way a boot would, and
is then left where it is rather than deleted.

### Sync failures are visible now

A desynced Dropbox target is a sync that will not be written to again, and nothing else reports it:
no upload is attempted, so no upload fails. `setDropboxSyncState` is driven from both the operation
log and the sync states, so the existing "Dropbox Sync Failed" notification covers it, and the
settings card shows a warning in place of the tick.

`migrateLegacyDropboxToken` is awaited, and its failure caught: a throw escaping the boot would
leave the page blank rather than merely unlinked. It still delays the first paint by a few Dropbox
requests on the first boot after upgrading, for anyone who had an account linked.

## 13. Third pass, 2026-09-10

### The app renders before boot rather than after it

`main.tsx` used to wait for `initialiseAndGetDBConnection()` before rendering anything, so every
wait for saved data was a blank page - and awaiting the Dropbox token migration made that wait a
network round trip. What is on screen now follows `app.storage`, which already had a `loading` state
that nothing ever rendered because nothing rendered at all until it was over:

-   `main.tsx` renders immediately and starts boot beside it.
-   `view.tsx` shows `StorageLoadingPage` while `storage.type === "loading"`.
-   `tutorial.tsx` stays out of the way while loading, since the store starts in the tutorial state
    and would otherwise flash it on every load.
-   `initialiseAndGetDBConnection` catches everything. A failure before the storage state is set
    would leave the loading screen up for good, so it falls back to the "unreadable" screen; a
    failure after it is logged, because the app is on screen and its data loaded fine.

The Dropbox token migration is a plain `await` again. Nothing is waiting to paint behind it.

### Failures say what went wrong

`UNKNOWN` on its own was all an application had to work with, because what was thrown was caught and
dropped at every point that produced it. An error result now carries an optional `detail`: the
message of what was thrown, the name it stringifies to when it has none (a stream handed a buffer it
cannot read throws an empty `TypeError`), or Dropbox's own `error_summary`, which is the most useful
of the three. TopHat puts it in brackets after the sentence it shows.

### An eleventh library defect, found in the browser

A version change transaction that is interrupted leaves the new version number behind without the
object store it was creating, and `onupgradeneeded` never runs again for a version already seen. The
store was never created and every read and write failed from then on, with no way back from inside
the app - the "Data Save Failed" notification and nothing else. `IndexedDBTarget.create` now opens
at whatever version the browser holds rather than a pinned 1, and reopens one version up when the
store is missing. Pinning the version was both what made this unrecoverable and what would have made
the repair unrecoverable, since asking for a version behind the one on disk is an error rather than
an open.
