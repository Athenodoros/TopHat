# Personal-storage-wrapper migration: reviewable PR queue

This plan replaces the single `hstoke/personal-storage-wrapper-migration` batch with a sequence of
PRs. Each PR starts from the latest `main`, contains one coherent change, and must be safe to deploy
on its own: pushes to `main` deploy TopHat to `gh-pages`.

The existing migration branch is reference material, not a sequence to cherry-pick. Its commits mix
storage, Dropbox, startup UI, conflict handling, and follow-up fixes. Port the relevant end state from
that branch into the boundaries below, and rebase each new PR after the preceding PR has been
validated and merged.

## Queue at a glance

| PR | Review boundary | Runtime impact | Depends on |
| --- | --- | --- | --- |
| 1 | Startup rendering and unusable-storage warning | Small UI/startup and warning fix | — |
| 2 | Separate tutorial import screen | Self-contained onboarding improvement | 1 |
| 3 | Storage-neutral data APIs | Refactor only | 1 |
| 4 | Raw legacy reader and retention rules | Tested dormant migration code | 3 |
| 5 | PSW dependency/tooling smoke test | No production activation | — |
| 6 | Local IndexedDB cutover to PSW | First migration boundary | 1, 3–5 |
| 7 | Conflict/overwrite safety | Dormant until a remote target exists | 6 |
| 8 | Dropbox cutover to PSW | Second migration boundary | 1, 6–7 |
| 9 | Dropbox option in tutorial import | Small onboarding completion | 2, 8 |
| 10 | Cleanup, settings import validation, and final documentation | Settings JSON import refuses invalid files | 1–9 |

## Invariants for every PR

- Existing `TopHatDatabase` data must never be deleted or overwritten before it has been copied
  successfully into the new store. Retain the old database for ten successful boots over at least
  fourteen days.
- A stored value that is corrupt, lacks the stub user row, or has a generation newer than
  `CURRENT_GENERATION` must lead to the recovery screen with all writes frozen.
- Until the new Dropbox target is activated, the existing redirect-based Dropbox backup must keep
  working. Do not create a deployed interval in which existing users silently stop backing up.
- Never activate a second storage target until startup conflict resolution and link-time overwrite
  protection are already present. PSW's default conflict resolvers are not safe for TopHat.
- Storage fixtures write IndexedDB through the raw browser API, not Dexie or PSW. Reads of the legacy
  database use the app's raw reader in `storage/legacy/`, which `database.test.ts` checks against
  Dexie. Add one test per mechanism rather than every permutation.
- Do not test extremely simple React markup, such as a component's `switch` from state to page.
  Exhaustive switches already make a missing case a type error; test logic and pure helpers instead.
- End every PR with `yarn build` and the relevant focused tests; run the full `yarn test` before the
  storage or Dropbox cutovers.
- Do not fold opportunistic UI redesigns, unrelated dependency upgrades, or Google Drive support
  into this queue.

## PR 1 — Render startup state, and warn when storage cannot be used

**Purpose:** Make boot progress, boot failure, and unusable storage visible, without changing which
storage state the app computes or which backend it uses.

`StorageState` already has all five of its cases, and `unavailable` is already produced today when
`indexedDB.open` fails on a browser with no existing database. What is missing is the rendering: boot
shows a blank page, and the existing IDB notification only appears once the user's first data action
runs the notification rules. Both halves are the same small change to how boot state reaches the
screen, so they ship together.

Changes:

- Render `<App />` immediately in `src/main.tsx`, while startup runs alongside it.
- Make `View` explicitly route `loading` to a small `StorageLoadingPage`, `unreadable` to the
  existing recovery page, and `failed` to a `StartupErrorPage`. Keep `loaded`, `empty`, and
  `unavailable` on the normal app path; the last is usable but unable to persist, and gets the
  warning below rather than a blocking screen.
- Make every `StorageState` consumer exhaustive, so a newly added blocking state cannot silently fall
  through to the main app. `View` uses a `switch` ending in `assertNever`; anything that only needs
  to know whether the app is showing uses `isAppRunning` in `storage/types.ts`, whose `switch` has no
  `default`, so a missing case is a type error.
- Suppress the tutorial and dialogs until `isAppRunning`, so the initial tutorial state never flashes
  before hydration, and a dialog opened by the URL (the Dropbox redirect opens storage settings) never
  appears over the loading or error pages.
- Catch every startup failure. If it occurs while state is still `loading`, set a new
  `{ type: "failed", error }` state: its page offers Try Again only, because a thrown error says
  nothing about the saved data, and the unreadable page's "Delete Data and Restart" must not be offered
  for data that may be fine. If data has already loaded, log the later subsystem failure and leave the
  app visible.
- Preserve the old Dropbox redirect race: capture the OAuth code synchronously before rendering can
  dispatch an action that rewrites history, then pass it into the startup implementation.
- Refactor notification rule evaluation into a reusable function and run it once when notification
  subscriptions are installed. Today boot-time storage failures happen before the listener exists,
  so the warning waits for the user's first edit.
- Keep `IDBNotificationDefinition` and its persisted id. Show permanent danger wording when nothing
  can save, with a link to storage settings. The future “Dropbox is carrying the only copy” warning
  can be added in PR 8, when PSW sync state exists.
- Put a concise warning on the tutorial for `storage.type === "unavailable"`.
- If notification state has to be reapplied wholesale, keep the implementation small and suppress
  undo history in the same way hydration does. PR 3's storage-neutral action/helper can replace it
  later; do not pull that work forward here.

Non-goals: no change to `setupIDBConnectionAndLoadData`, to how `unavailable` and `unreadable` are
told apart, or to any storage write path.

Tests and review checks:

- No test of the `View`/tutorial markup: exhaustive switches make a missing case a type error.
- A rejected pre-storage startup promise leaves the `failed` state rather than an endless loader.
- Boot with `indexedDB.open` failing and assert that the warning exists without another data action.
- Confirm the tutorial says entered data cannot be saved.
- Confirm the notification cannot be dismissed permanently while the failure remains.
- Manually throttle IndexedDB startup and confirm the loading page appears, then the normal app.
- `yarn build && yarn test`.

Reference: the loading pieces in migration commit `d18a838`, plus the notification initialization and
IDB warning in `fcff565`, both adjusted to keep the current Dropbox redirect flow alive and excluding
`fcff565`'s PSW-specific Dropbox branch.

Found while implementing (branch `hstoke/render-startup-state`):

- Rendering before boot means `View` installs the "undo" snack submitter before boot's own data
  actions run, so every boot showed an "Automated cache update — UNDO" toast (and a Dropbox redirect
  would show "Demo data loaded!"). The migration branch has the same regression. PR 1 fixes it without
  a separate signal: boot makes its own data changes (redirect demo data, the monthly cache update)
  before it sets the storage state, and `View` only installs the submitter once `storage.type` has
  left `loading`.
- Exhaustiveness lives in two places: `View`'s `switch` (ending in `assertNever`) chooses the page, and
  `isAppRunning` in `storage/types.ts` decides whether the tutorial and dialogs may show. PR 7 adds
  `conflict` to `StorageState`; the compiler then requires a case in both.
- A boot failure while `loading` sets `{ type: "failed", error }` with its own Try Again page, not the
  unreadable page, whose "Delete Data and Restart" would be offered for data that may be fine.
- A dialog can be open from the first render (the `/dropbox` path opens storage settings), which was
  invisible when the app rendered after boot. `TopHatDialog` now waits for `isAppRunning`.
- Startup's "silently set up demo data on a Dropbox redirect" branch is a 2021 leftover (`3c0cd38`)
  from when new installs started on demo data. It is only reached when a redirect finds nothing
  saved: private browsing, where the redirect itself threw the in-memory data away, or a stale
  `?code=` URL. The old flow then uploads that demo data over `/data.zip`, which may be the user's
  only copy (an empty tutorial state would be uploaded just the same without the branch). PR 1 leaves
  it alone as existing behaviour. PR 8 deletes it with the rest of the redirect flow; do not port it,
  because link-time preflight replaces it.
- `yarn test` runs Vitest in watch mode and never exits in a non-interactive shell; agents should use
  `yarn vitest run [path]`. The storage suite takes about 5 seconds, not minutes.
- A checkout that was last installed on the migration branch has PSW in `node_modules` and no Dexie,
  so `yarn build` fails on `main`. Run `yarn install --frozen-lockfile --check-files` after switching.

## PR 2 — Give tutorial imports their own screen

**Purpose:** Land the tutorial/UI change independently of storage and Dropbox synchronization.

Changes:

- Split `TopHatTutorial` into a welcome page and an “Import Existing Data” page held in local UI
  state. Change “Upload Data” on the welcome page to “Import Existing.” Keep Start Fresh and Begin
  Demo unchanged.
- Move file reading out of the component into `importDataFile(file)` in
  `src/state/logic/import.ts`.
- Accept a normal `.json` TopHat export and a `.zip` containing `data.json` (the old Dropbox backup
  format). Reject the settings CSV-export ZIP with an explicit explanation.
- Add a local dropzone plus Choose File card, loading state, error state, and Back action. Ensure its
  drag events do not bubble into the app-wide CSV statement dropzone.
- Deliberately omit the Dropbox card in this PR. Add it only after `linkDropboxAccount()` exists in
  PR 8.

Tests and review checks:

- Unit tests cover JSON, ZIP-with-`data.json`, and CSV ZIP rejection.
- Manually exercise click and drag/drop import, including a JSON drop inside the nested dropzone.
- Confirm Start Fresh and Begin Demo behave exactly as before.
- `yarn build && yarn test src/state/logic/import.test.ts`.

Reference: `src/app/tutorial.tsx` and `src/state/logic/import.ts` at `fcff565`, minus the Dropbox card.

Found while implementing (branch `hstoke/tutorial-import-screen`):

- The welcome button reads "Import Data", not "Import Existing".
- Reading is separate from importing, and the user confirms before anything is replaced.
  `readDataFile(file)` checks the file without touching the store: it must be valid JSON with a stub
  user row, and its generation must not be newer than `CURRENT_GENERATION`. `importData(data)` then
  applies it. `handleJSONFileUpload(files)` tracks progress in `state.app.jsonImport`
  (`JSONImportStatus`: `idle | loading | loaded | error`), and the import page shows the file name
  with account and transaction counts before offering Import Data. There is no `importDataFile`.
- A ZIP may contain any single `.json` file, not only `data.json`; `__MACOSX/` entries are ignored.
  A ZIP with no JSON is refused as a CSV export, and one with more than one JSON file is refused.
- There is no nested dropzone. The app-wide dropzone in `src/app/context.tsx` changes what it accepts
  and which handler runs based on `FileHandlerContext.fileImportHandler`. The tutorial sets it to
  `"JSON-IMPORT"` while it is open and `isAppRunning` is true, and resets it (plus `jsonImport`) when
  it closes. The dialog's drag highlight only reacts to `"GENERAL-IMPORT"` drags. The tutorial
  `Dialog` uses `disablePortal`, because a portalled dialog sits outside the dropzone in the DOM and
  would end the drag. The old tutorial-JSON special case in `handleStatementFileUpload` is gone.
- `CURRENT_GENERATION` (currently 5) is now exported from `storage/migrations.ts`. Later PRs should
  import it rather than define their own, and every new migration must increase it.
- The import page lays its cards out in a row, so PR 9's Dropbox card can sit beside the upload card.
- The JSON import in storage settings still calls `importJSONData(string)` directly, without
  `readDataFile`'s checks. That was left out of scope; PR 10 moves it onto the validated path.

## PR 3 — Make the persisted data boundary storage-neutral

**Purpose:** Remove IndexedDB-specific vocabulary and duplicated shape conversion before replacing
the implementation.

Changes:

- Rename `DataSlice.actions.setFromIndexedDB` to `setFromStorage` everywhere. Its semantics remain:
  replace each entity adapter from lists without creating an undo patch or snack.
- Add one canonical pure `toListDataState(data: DataState): ListDataState` helper beside the data
  state types (or in a small storage-neutral module). Replace local `asLists`/`toLists` production
  implementations with it where appropriate.
- Export `initialTutorialState` through a narrow factory/helper if the storage layer needs it; avoid
  allowing mutable shared state to escape.
- Rename `setupIDBConnectionAndLoadData` to `setupStorageAndLoadData` and make startup consume a
  small connection/debug interface rather than importing `TopHatDexie` directly. The implementation
  remains Dexie in this PR.
- Preserve reducer wrapping, patch suppression, migrations, cache updates, and listener timing.

Tests and review checks:

- Existing storage tests pass unchanged apart from names.
- Add a small round-trip test for `DataState -> ListDataState -> setFromStorage` if existing storage
  tests do not already pin all keys.
- `rg 'setFromIndexedDB|setupIDBConnectionAndLoadData' src` returns no production references.
- `yarn build && yarn test src/state/logic/storage`.

This is intentionally behavior-free; reviewers should be able to verify it as a mechanical API
boundary cleanup.

Found while implementing (branch `hstoke/storage-neutral-data-apis`):

- `toListDataState` already existed in `src/state/data/index.ts` (PR 1 added it for notification
  reapplication). The only other copy was the test-only `asLists` in `storage/index.test.ts`, which now
  wraps it. Dexie hydration still builds its lists from table reads with `zipObject`, because it never
  had a `DataState` to convert.
- `initialTutorialState` stays private: the Dexie path does not need it. PR 6 must expose it through a
  factory that returns a fresh value when PSW needs a tutorial initial value.
- `setupStorageAndLoadData` returns `{ connection, storage }`, where `StorageConnection` (in
  `storage/types.ts`) only carries `debugVariables` (currently `{ db }`). Startup no longer imports
  `TopHatDexie`; PR 6 can put its manager there instead.
- The suppressed rewind message changed from "Loaded from IndexedDB" to "Loaded from storage". It is
  never shown, because the action suppresses both the snack and the patch.
- A round-trip test (`DataState -> ListDataState -> setFromStorage` over demo data, asserting every
  `DataKey` is present) lives in `src/state/data/index.test.ts`.

## PR 4 — Extract and test the legacy database reader

**Purpose:** Isolate the highest-risk data migration code while Dexie is still the active backend.

Changes:

- Add `src/state/logic/storage/legacy/index.ts`, the one raw IndexedDB reader of `TopHatDatabase`,
  for production and tests alike. `readLegacyTables()` opens without a version and returns every
  non-internal table under its stored name, including tables this version doesn't know.
  `getLegacyLists()` maps them onto `DataKeys` (`transaction_` to `transaction`, a missing table
  reads as empty). `readLegacyDatabase()` adds the migration rules on top.
- Rename `database.testing.ts` to `legacy/fixtures.testing.ts`, since it outlives the `database.*`
  files, and move the raw read out of it: its `readFromLegacyDatabase` becomes a sorted wrapper
  around `legacy/index.ts`, so `database.test.ts`'s comparisons against Dexie test the reader that
  the migration will use. The fixture keeps what must stay independent of the app and is shared between test
  files: the raw writer, both schema definitions, and the fixture data. Helpers used by one test
  file live in that file, and nothing is re-exported from `legacy/index.ts`.
- Point `rescue.ts` at `readLegacyTables` and `deleteLegacyDatabase`, keeping its exports, its
  user-facing "open in another tab" message, and its reading of unknown tables for the debug file.
- Add migration-record helpers and the retention policy: ten successful boots spanning at least
  fourteen days. Do not call the deletion path yet.
- Make “database absent” return `null` without leaving behind the empty database that an unversioned
  `indexedDB.open` creates.
- Rename the fixture helpers to distinguish legacy database operations from future store operations.
- Move `import "fake-indexeddb/auto"` out of the fixture file into each test file that needs it.
- Add focused tests for current schema, pre-patches schema, no database/no artefact, and retention
  boundary calculations. Do not change runtime hydration yet.

Tests and review checks:

- `database.test.ts` keeps only the comparisons with Dexie, so it can be deleted with `database.ts`.
- `legacy/index.test.ts` proves every list and optional legacy field survives the read, and that
  neither time nor boot count alone permits deletion.
- `yarn build && yarn vitest run src/state/logic/storage`.

Reference: `src/state/logic/storage/legacy.ts` and the legacy fixture portions of
`database.testing.ts` at `fcff565`.

Found while implementing (branch `hstoke/legacy-database-reader`):

- `readLegacyDatabase()` returns `null` only when the database is absent or every data table is
  empty (Dexie creates all tables on first open, so an install that never saved looks like that). It
  **throws** when the database can't be read, or has rows but no stub user row. `fcff565` did
  `readLegacyDatabase().catch(() => null)` and also read "rows but no user" as `null`. Do not port
  either in PR 6: both would treat a possibly-only copy as a fresh install instead of going to
  recovery. The reader does not check generations; PR 6 compares against `CURRENT_GENERATION`.
- The reader and the lock check `indexedDB.databases()` first, and don't open a database that isn't
  there. An open creates a missing database, and a Dexie tab opening at that moment lands on the
  empty database just before it is deleted again. Browser testing showed the app tab then hangs on
  "Loading TopHat" or says it can't save. PR 6 locks and reads on every boot with an empty store,
  so a fresh install would hit this. Where `databases()` is missing (Firefox before 126), or the
  database goes between the check and the open, the open's own database is deleted as before.
  Only a database the open created (`oldVersion === 0` in `onupgradeneeded`) is deleted.
  `fcff565` deleted any database with no data tables, which could remove one it didn't create.
- Retention is pure and separately testable: `countBootFromStore(record, now)` returns the counted
  record and `canDelete`. `recordLegacyMigration()` writes `{ migratedAt, boots: 0 }`: the boot that
  copies does not count (`fcff565` started at 1). `recordBootAndMaybeDeleteLegacyDatabase()` must be
  called only by a boot that loaded from the new store. An unreadable record or timestamp never
  permits deletion. A delete blocked by another tab keeps the count, so a later boot tries again.
  The localStorage key stays `tophat-legacy-migration`. A localStorage that throws (blocked by the
  browser, or full) reads as no record and fails to save silently: either only delays deletion.
- IndexedDB cannot cancel a blocked request. `deleteLegacyDatabase()` and `lockLegacyDatabase()`
  reject if still blocked after one second (a Dexie tab closes its connection when asked), but the
  request stays queued and still goes through once the other tab lets go. Until then, any later
  open of `TopHatDatabase` in the same tab queues behind it. A second request would only queue too,
  so neither sends one. `deleteLegacyDatabase(onStillBlocked)` waits for the deletion instead of
  rejecting. The recovery screen uses it: its delete button stays disabled with a spinner, the page
  says the data will go once the other tab closes, and it restarts when it does.
- `lockLegacyDatabase()` raises `TopHatDatabase` to IndexedDB version `LEGACY_LOCKED_VERSION`
  (1000; Dexie's schema is 20) without touching a row, and does nothing where there is no database.
  Every released TopHat used Dexie 3 (3.0.3 to 3.2.7), which refuses a database at a higher version
  than it declares, and closes an open connection when another asks to upgrade. So after the lock,
  no old tab, including one started again from the service worker's cache, can read or write the
  database. Without it, an old tab could keep saving into `TopHatDatabase` after the copy, and
  retention would later delete those edits. `database.test.ts` checks both Dexie behaviours. The
  reader opens with no version, so a locked database still reads normally.
- The reader closes every connection it opens. An unversioned raw connection has no
  `onversionchange`, so one left open would block this tab's own lock or delete.
- Today's Dexie startup treats "rows but no stub user" as `empty`, and the first change writes over
  it; the reader throws instead. That difference is deliberate.
- Fixture exports in `legacy/fixtures.testing.ts`: `LegacySchema` (was `CurrentSchema`),
  `LegacySchemaBeforePatches`, `readFromLegacyDatabase`, `writeToLegacyDatabase`, `sortLists`, and
  the fixture data. Tests import `deleteLegacyDatabase` from `legacy/index.ts`.
  `legacy/index.test.ts` defines `getLegacyDatabaseVersion()` (via `indexedDB.databases()`, which
  never creates a database), the raw migration-record read/write, and `daysAgo`; `index.test.ts`
  defines `pause`, `waitFor` and `getMonthsSince`. PR 6 should name its store helpers without the
  `Legacy` prefix.
- `storage/legacy/` holds only code that exists purely for backwards compatibility with the Dexie
  database: the reader, retention, and their fixtures and tests. `database.ts` and
  `database.test.ts` stay outside it, because they are the live backend until PR 6 deletes them;
  so do `rescue.ts` (PR 6 extends it to the new store) and `migrations.ts` (runs against any store).
  Later PRs should put any further legacy-only code there, such as PR 8's `/data.zip` fallback if
  it becomes its own module.
- `rescue.ts` still reads only `TopHatDatabase`. PR 6 expands rescue/delete to the new store.

## PR 5 — Add and prove the PSW dependency without activating it

**Purpose:** Make dependency installation, source transformation, and test isolation reviewable
separately from moving user data.

Changes:

- Pin `personal-storage-wrapper` to exact commit
  `224fecb08aa96f849d16b52469cc24f134d25a07` (current PSW `main`) and add direct `fflate` support.
- Add the TypeScript/Vite/Vitest aliases required by PSW's source package. Exclude it from Vite
  dependency pre-bundling and inline it for Vitest module resets.
- Add the test-only in-process `BroadcastChannel` implementation used by multi-boot tests.
- Add a small integration test which creates/closes an IndexedDB target through PSW and verifies it
  against a raw IndexedDB helper. Production startup must not import or instantiate PSW yet.
- Document `yarn install --check-files` after changing the pin; a plain install can retain a stale
  git dependency because every PSW commit has version `0.0.0`.

Tests and review checks:

- Clean install, `yarn build`, and the PSW integration test pass.
- Inspect the production bundle to ensure only the expected PSW code is included once it is later
  imported; this PR should cause no runtime behavior change.

Reference: dependency/config/test-setup files at `79b3035`/`fcff565`.

## PR 6 — Switch browser persistence from Dexie to PSW (local target only)

**Purpose:** Perform the core persistence migration without simultaneously changing Dropbox.

Changes:

- Create one `PersonalStorageManager<ListDataState>` with id/key `tophat`, one compressed
  `IndexedDBTarget`, sync config in `tophat-syncs`, polling disabled, and the Redux echo guard.
- Load PSW first. Only if it is empty, call `lockLegacyDatabase()` and then PR 4's raw legacy
  reader, in that order, so that no old tab can write between the read and the lock. If the legacy
  database is absent or empty, use the tutorial initial value. Apply `setFromStorage`, run
  migrations, and save the migrated value immediately. If the lock is still blocked, do not read:
  go to the `failed` page (Try Again), since the rows could still change.
- Record a legacy copy on migration, count only later successful boots from the new store, and
  delete the legacy database only after both retention thresholds pass.
- Expand rescue/delete behavior to understand both stores and clear PSW sync metadata. A corrupt
  compressed row, missing stub-user row, or future generation freezes writes and exposes the
  recovery screen without mutating either store. Compare against the `CURRENT_GENERATION` exported
  from `storage/migrations.ts` in PR 2.
- Replace Dexie/dexie-observable and remove their production dependencies after all legacy reads use
  raw IndexedDB.
- Leave `storage/index.ts` as storage-neutral startup. Today it also holds the Dexie backend: loading,
  the save subscription, the change listener, and the `Dexie.exists` failure check. PR 4 left that
  alone to avoid churn before the switch. The PSW equivalents should live in their own module(s),
  so that `index.ts` only sequences boot, `legacy/` holds only backwards-compatibility code, and
  the backend module is the only one that knows about PSW.
- Keep the old `src/state/logic/dropbox.ts`, its redirect flow, its startup subscription, and the
  `user.dropbox` field active. It now backs up the Redux state whose local persistence is PSW. This
  avoids a deploy where existing backups stop before their tokens are migrated.

Tests and review checks:

- Fresh install, full-state save/load, first-action deletion, migrated-value persistence, corrupt
  bytes, missing user, future generation, and cross-tab update.
- Legacy current/pre-patches schema migration, PSW-over-legacy precedence, original left untouched,
  the database locked before it is read, and the two retention thresholds.
- Existing old Dropbox tests still pass, including OAuth redirect and upload.
- Once boot reads through the legacy reader, `legacy/index.test.ts`'s "reads every list and optional
  field" duplicates `index.test.ts`'s "loads every field of data saved months ago". Keep only one.
- `database.test.ts` goes with Dexie. It holds the only checks against Dexie of both the reader and
  the fixture writes, so confirm nothing else relies on it before deleting it.
- Manual checks: fresh install/reload, legacy migration/reload, two-tab update, recovery/delete, and
  unavailable IndexedDB.
- `yarn build && yarn test`.

This is the first large PR, but its scope is one data path: browser persistence. PRs 3–5 remove the
mechanical and fixture work from its review.

## PR 7 — Land remote-conflict safety before adding a remote target

**Purpose:** Make the data-loss rules independently reviewable while production still has only one
PSW target.

Changes:

- Add pure helpers for `getGeneration`, `holdsRealData`, target identity, copy descriptions, and
  new-install placeholder comparison. “Real data” must consider accounts, categories, currencies,
  institutions, rules, transactions, and statements; demo/tutorial data and notification/patch
  bookkeeping are disposable.
- Add push-marker recording for successful uploads. Compare local timestamps only with prior local
  timestamps, and remote timestamps only with prior remote timestamps.
- Add the startup resolver: remote-only movement takes remote, local-only movement keeps the live
  Redux value, both moved opens a user choice, and timestamp fallback prefers local when clocks are
  within sixty seconds.
- Add `conflict` to `StorageState` (with cases in `View`'s switch and `isAppRunning`), an exhaustive
  `StorageConflictPage`, and `chooseStorageCopy`.
  While a choice is pending nothing may be written. Choosing an unreadable copy goes to recovery
  and leaves the resolver pending rather than overwriting either side.
- Wire these callbacks into the existing local-only manager even though no conflict can occur yet.

Tests and review checks:

- Pure tests cover remote-only movement, local-only movement/live edits, both moved, missing marker,
  one-minute tolerance, and push-marker commit timing.
- A two-IndexedDB-target integration fixture covers the chooser, no writes while pending, chosen
  copy propagation, and a newer-schema descendant remaining byte-for-byte unchanged.
- Tests cover an install whose only custom content is in a placeholder-bearing list (for example,
  institutions) and a truly fresh install.
- `yarn build && yarn test src/state/logic/storage`.

Reference: `manager.ts`, `manager.test.ts`, conflict UI, and related integration tests at `fcff565`.

## PR 8 — Replace bespoke Dropbox backup with a PSW Dropbox target

**Purpose:** Activate multi-target storage only after PR 7 makes it safe.

Changes:

- Add the popup-based PSW Dropbox module, static `public/dropbox.html`, service-worker navigation
  denylist, and the defensive `main.tsx` guard that prevents the callback page booting TopHat.
- Preflight an account before adding it. If browser and account both hold real data, return a
  conflict outcome without changing either. If the browser is tutorial/demo/placeholders, adopt the
  remote. If the account is empty, keep and upload the browser data.
- Prefer `/data.json.gz`; only fall back to the old `/data.zip` when the new file is absent. Migrate
  and adopt the legacy file but leave it in Dropbox. That ZIP's `data.json` has the same shape as the
  files PR 2's `readDataFile` accepts, so share its stub-user and future-generation checks rather than
  copying them. Still read only `data.json`, because that is the only name the old backup ever wrote.
- Migrate a legacy `user.dropbox` refresh token once. Offline means retry on a later boot; invalid
  auth clears the unusable token and reports failure. Await and contain this work so it cannot make
  startup blank or unhandled.
- Add ephemeral sync display state to the app slice. Move storage settings from `user.dropbox` to
  manager sync state, with linking, cancellation, refusal/failure details, desync warning, and
  unlinking.
- Replace old Dropbox notification plumbing with PSW operation/sync-state reporting. Extend PR 1's
  IDB warning with the amber “Dropbox is the only working copy” case.
- Delete the old Dropbox module and its upload subscription only after legacy-token migration and
  all equivalent UI paths are present in this same PR.

Tests and review checks:

- Link outcomes: both-real-data refusal, demo/fresh adoption, empty remote keeps local, custom
  institution counts as real, legacy ZIP fallback, current file beats stale ZIP, missing scope, and
  useful Dropbox error detail.
- Legacy token: successful one-time migration, offline retry, invalid token notification.
- Local target unavailable + Dropbox working produces the amber warning; neither working produces
  red.
- Manual popup cancellation and static callback checks, including after service-worker install.
- The maintainer manually validates a real Dropbox account and registered redirect URIs.
- `yarn build && yarn test`.

This is the second intentionally larger PR. Authentication, token migration, target activation, and
the settings UI are one atomic shipping boundary because splitting them would either stop backups or
expose an unsafe/half-configured target.

## PR 9 — Add Dropbox import to the tutorial

**Purpose:** Finish the onboarding improvement using the already-reviewed link API.

Changes:

- Add a second card, “Connect to Dropbox,” beside the upload card in the row that
  `TutorialImportContents` already has. Build on the tutorial as it is on `main`. `fcff565`'s tutorial
  keeps its page and loading state inside the component and has no confirm step, so do not port its
  structure; take only the Dropbox card and its outcome handling from it.
- Reuse the shared `DropboxLinkProblem` extracted from storage settings.
- Handle every `DropboxLinkOutcome`: cancelled snack, failed/refused explanation, linked-empty
  confirmation, and successful remote adoption (which closes the tutorial when imported user state
  arrives).
- Keep file import and Dropbox linking mutually exclusive. Files are not only chosen with a button:
  drops anywhere in the app reach `handleJSONFileUpload` through the shared dropzone. While a link is
  pending, both Choose File and drops must be ignored. Disable the Dropbox card while
  `state.app.jsonImport` is `loading`, and also while it is `loaded` and waiting for confirmation.
- `fcff565` also changes the tutorial's unavailable-storage warning to suggest connecting Dropbox.
  Make that wording change here, where the Dropbox option first appears.

Tests and review checks:

- Test the outcome-to-message/state helper as a pure unit if no tutorial component harness exists.
- Manually test cancel, empty account, account with existing TopHat data, and back navigation.
- `yarn build && yarn test`.

Reference: the remaining tutorial and `DropboxLinkProblem` portions of `fcff565`.

## PR 10 — Remove migration scaffolding and document the final system

**Purpose:** Make cleanup reviewable and avoid hiding it in either cutover. The one intended behaviour
change is that the settings JSON import validates files the way the tutorial import does.

Changes:

- Remove dead redirect routes, obsolete helpers, mocks, comments, and dependencies only after `rg`
  proves they are unused. Keep `User.dropbox` parsing compatibility while old saved values can still
  contain it.
- Route the Import JSON button in storage settings (`src/dialog/settings/data.tsx`) through
  `readDataFile` and then `importData`, replacing its module-level `FileReader`. That button currently
  imports whatever it is given and fails silently. Show `readDataFile`'s error message to the user
  instead of importing, and accept the same `.json`/`.zip` files as the tutorial. Keeping the
  unvalidated behaviour is not required: importing a non-TopHat or newer-generation file can break the
  app. Then delete `importJSONData`, which will have no callers left.
- Update `AGENTS.md` with the final PSW architecture, raw fixture convention, conflict/push-marker
  rule, recovery freeze, install command, and legacy-retention rule.
- Update the migration design docs with decisions that changed during implementation.
- Record the manual verification matrix and the exact PSW commit in the PR description.

Tests and review checks:

- `rg` for Dexie, old Dropbox entry points, and `setFromIndexedDB`; every remaining match is an
  intentional legacy-compatibility comment/test. `rg importJSONData src` returns nothing.
- `readDataFile`'s existing unit tests already cover validation. Manually confirm that settings
  refuses a non-TopHat JSON file and a newer-generation export with a visible message, and still
  imports a valid export.
- Clean install followed by `yarn build && yarn test`.

## Handoff protocol for the agent queue

For each PR, the agent should:

1. Read this entire plan, `AGENTS.md`, and the relevant final files on
   `hstoke/personal-storage-wrapper-migration` before editing.
2. Start a fresh branch from the newly merged `main`; do not stack on an unmerged predecessor.
3. Restate the PR's preserved behavior and explicit non-goals in its description.
4. Keep changes inside that PR's boundary. If a required dependency from an earlier PR is missing,
   stop and report it rather than silently pulling later work forward.
5. Report focused tests, full tests where required, and manual paths with pass/fail evidence.
6. Stop after opening/preparing that one PR. The maintainer validates and merges it before the next
   agent begins.

The natural pause points are after PR 2 (all user-visible prep landed), PR 6 (local persistence
migrated while old Dropbox remains intact), and PR 8 (the actual multi-target cutover). If review
finds a safety issue at any pause, subsequent work can wait without leaving users on an incomplete
storage path.
