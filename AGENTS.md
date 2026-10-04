# AGENTS.md

This file provides guidance to coding agents when working with code in this repository.

## What this is

TopHat is an offline-first personal finance web app: no backend, all state lives client-side in Redux and is persisted to IndexedDB (via personal-storage-wrapper, below). It's a static SPA built with Vite/React/TypeScript, deployed to GitHub Pages at a `/TopHat` base path. Multi-currency support and CSV bank-statement import are core features.

## Commands

-   `yarn dev` — start the dev server (Vite, bound to `0.0.0.0`)
-   `yarn build` — typecheck (`tsc`) then build for production with `--base=/TopHat/`
-   `yarn preview` — preview the production build
-   `yarn test` — run tests (Vitest)
-   `yarn test <path or -t pattern>` — run a single test file or match by name, e.g. `yarn test src/state/data/index.test.ts` or `yarn test -t "State remains valid"`
-   `yarn format` — format everything with Prettier; `yarn format:check` reports anything unformatted without changing it

CI (`.github/workflows/main.yml`) runs `yarn format:check`, `yarn test --run` and then `yarn build` on every pull request and push to `main`. Only `main` deploys - on a push, or when the workflow is run by hand - and only if all three pass. A pull request is checked but never deployed.

There is no separate lint script; type errors surface via `tsc` (run as part of `build`). Prettier config is in `.prettierrc.json` (tabWidth 4, printWidth 120), and `.prettierignore` leaves out build output. CI fails on any file Prettier would change, so run `yarn format` (or your editor's Prettier integration) before pushing.

Tests use Vitest with a jsdom environment set per-file via `/** @vitest-environment jsdom */` docblocks (see `src/state/data/index.test.ts`). Vitest config is in `vitest.config.ts`, separate from `vite.config.ts`.

The persistence tests (`src/state/logic/storage/`) boot the whole app against an in-memory IndexedDB (`fake-indexeddb`). Their fixtures write and read both stores through the raw IndexedDB API, never through the app's storage library: `fixtures.testing.ts` for the store the app saves into now (plus an in-process `BroadcastChannel`, so that two boots in one file talk like two tabs), and `legacy/fixtures.testing.ts` for the database the Dexie version of the app left behind, whose reads go through the app's own raw reader in `storage/legacy/`. `legacy/index.test.ts` covers that reader's rules, locking and legacy retention, and `index.test.ts` the loading, saving, migration and recovery itself. A boot that writes straight after another has started must move the mocked clock forward first, since a manager ignores a value from another tab that is not newer than its own. Test files import `fake-indexeddb/auto` themselves, before anything else. Evaluating the app's module graph takes about half a minute the first time in a file, so `index.test.ts` does it once at collection time and each subsequent boot is fast.

### personal-storage-wrapper

`personal-storage-wrapper` (PSW), a sibling library of Henry's, is installed as a git dependency pinned to a commit. Only `storage/store.ts` imports it, and its own behaviour is tested in its own repo rather than here. It ships TypeScript source rather than a build, so the import is resolved by an alias in `vite.config.ts`, `vitest.config.ts` and `tsconfig.json`. `vite.config.ts` also excludes it from dependency pre-bundling so that the aliased source is what gets served, and `vitest.config.ts` inlines it so that `vi.resetModules()` gives each boot its own copy. Its compression falls back to `fflate` where the browser has no `CompressionStream`, and the git install does not bring the library's own dependencies with it, so `fflate` is a direct dependency here.

**After moving the pinned commit, run `yarn install --check-files`.** The library's `package.json` says `"version": "0.0.0"` at every commit, so yarn keeps a cache entry for it that is not specific to a commit, and can populate `node_modules` from a copy built at a different one. A plain `yarn install` will not notice: it trusts `node_modules/.yarn-integrity`, reports "Already up-to-date" and changes nothing. What you get instead is a missing export, which is a stale `node_modules`, not a mistake in the library. `--check-files` compares what is on disk and repairs it. CI is unaffected, since a clean runner has no cache to reuse. `--check-files` only helps if the cache holds the right copy, though, and yarn has been seen filling `node_modules` from a stale cache entry with no commit in its name (`npm-personal-storage-wrapper-0.0.0`). `yarn cache clean personal-storage-wrapper` does not find it, because the tarball calls itself `personal-storage-wrapper-repo`. If the installed source still differs from the pinned commit, delete the `npm-personal-storage-wrapper-0.0.0*` directories under `yarn cache dir` other than the pinned commit's, then `node_modules/personal-storage-wrapper`, and install again. To see which copy is installed, compare `node_modules/personal-storage-wrapper/personal-storage-wrapper/src` against the pinned commit in the library's repo.

## Architecture

### State: two Redux slices, both in `src/state/`

-   **`app`** (`src/state/app/`): ephemeral UI state — which page/dialog is open, table filters/sort, etc. Its reducer is wrapped to sync `window.history` with the current page state (`getPagePathForPageState`/`getAppStateFromPagePath` in `src/state/app/index.ts`), so routing is derived from Redux state rather than a router library. Page-specific state shapes live in `pageTypes.ts`; defaults in `defaults.ts`.
-   **`data`** (`src/state/data/`): the actual financial data — accounts, categories, currencies, institutions, rules, statements, transactions, notifications, users, plus a `patches` entity used for undo/history. Each entity type is a `@reduxjs/toolkit` `createEntityAdapter` (see the `adapters` map in `src/state/data/index.ts`), each with its own sort comparer (by name, by index, by date, custom for accounts/categories).

Both slices' reducers are monkey-patched after `createSlice` (reassigning `Slice.reducer`) to add cross-cutting behavior — don't remove this pattern when editing either slice:

-   `data`'s reducer wrapper (`src/state/data/index.ts`) computes an rfc6902 JSON patch of every change (through `history.ts`, whose own array diff replaces rfc6902's, which recurses once per element and overflows the stack on long lists), stores it in `state.patches` (pruned after 30 days) to power the settings "history"/rewind feature, and fires a toast notification via `submitNotification`/`rewindDisplaySpec` — a reducer sets `rewindDisplaySpec = { message, ... }` before returning to control the notification text/suppression, since reducers can't call hooks directly.
-   `data` also maintains denormalized rolling caches on every mutation: per-account/currency/category monthly transaction summaries (credits/debits buckets keyed off a rolling `history.start`) and per-account running balances. Any reducer that adds/edits/removes transactions must call the appropriate `update*` helpers (`updateTransactionSummariesWithTransactions`, `updateBalancesAndAccountSummaries`, `updateCategoryTransactionDates`, etc.) to keep these caches consistent — they are not recomputed lazily on read.
-   `app`'s reducer wrapper pushes to `window.history` whenever the computed path changes.

### Persistence and startup (`src/state/logic/`)

-   `storage/store.ts` is the only module that knows about PSW: one `PersonalStorageManager<ListDataState>` with id `tophat`, holding the whole of the data as one compressed row in a single IndexedDB target, its target list in localStorage under the library's default key for that id, and no polling. The library never writes over a value it couldn't decode or that fails the `validate` check TopHat gives it, and a manager that can't read the store at startup makes opening the store throw, with nothing written.
-   `storage/index.ts` sequences storage on boot. Only if the store is empty - inside the manager's initial-value function, so that nothing is written if it fails - does it lock the old Dexie database (`TopHatDatabase`) against old tabs and then read it, in that order, through `storage/legacy/`; a lock another tab holds up leaves the app on the Try Again page. It hydrates Redux (`setFromStorage`), runs data migrations (`storage/migrations.ts`), saves the migrated value at once, and saves the whole value on every change after (`subscribeToDataUpdates`). Values from other tabs arrive over PSW's broadcast channel, behind a guard that stops them being saved straight back, and are migrated like a stored value, since the other tab may run an older version. A tab that has frozen for recovery (below) no longer uploads to Dropbox either.
-   A stored value that won't decode, has a list that isn't an array, has no stub user row, or has a generation newer than `CURRENT_GENERATION` - in either store, or arriving from another tab - puts the app on the recovery screen with nothing written to either store; a tab that receives one from another tab closes its manager first, and a boot still running then skips the legacy retention bookkeeping. A list missing from a stored value is not a problem: it loads as empty, so that adding a list to `DataKeys` doesn't strand existing data. A store that can't be opened is only `unavailable` (usable, unsaved) if it has never been opened in this browser - there is no saved target list - and the old database holds no rows; otherwise it goes to the recovery screen too. `storage/rescue.ts` gives that screen its debug download and its deletion of both stores, the target list and the migration record.
-   No row of the old database is ever changed: it is only locked, and eventually deleted. A copy is recorded in localStorage (`tophat-legacy-migration`), and the database is deleted only after ten later boots from the new store spanning at least fourteen days (`storage/legacy/`). A boot from the store that finds no record but a locked old database records the copy then, since only a copying boot locks it. Retention only ever delays the deletion, so a failure in its bookkeeping is logged rather than failing the boot.
-   `startup.ts` orchestrates boot: set up storage as above, otherwise fall back to demo data (`state/data/demo/`) or an empty tutorial state, then wire up notifications, Dropbox and currency syncs.
-   `import.ts` / `statement/` handle bank statement CSV parsing and account-format detection.
-   `currencies.ts` / `dropbox.ts` handle currency rate syncing and optional Dropbox-based cloud backup.
-   `notifications/` is a pluggable system for user-facing alerts (each "variant" in `notifications/variants/` watches for a specific condition, e.g. stale currency rates, IDB unavailable, Dropbox sync issues).

### UI layers

-   `src/app/`: app shell — context providers, top-level view/routing switch (`view.tsx`), navbar, notifications, popups, tutorial overlay.
-   `src/pages/`: one directory per top-level page (`summary`, `accounts`, `account`, `categories`, `category`, `transactions`, `forecasts`), matching the `app` slice's page states.
-   `src/dialog/`: the modal dialog system — object create/edit forms (`objects/`, one per entity type), statement import wizard (`import/`), and settings screens (`settings/`).
-   `src/components/`: shared presentational building blocks (tables, inputs, charts/snapshot, layout) reused across pages and dialogs.
-   `src/shared/`: cross-cutting utilities/types/hooks/constants not specific to state or UI.
-   `src/styles/`: MUI theme and color definitions.

When adding a new financial entity field or a new page/dialog, expect to touch: the type in `src/state/data/types.ts`, the entity adapter/reducers in `src/state/data/index.ts`, any relevant cache-update helper, the corresponding form in `src/dialog/objects/`, and the display components under `src/pages/`/`src/components/`.
