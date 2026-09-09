# AGENTS.md

This file provides guidance to coding agents when working with code in this repository.

## What this is

TopHat is an offline-first personal finance web app: no backend, all state lives client-side in Redux and is persisted to IndexedDB (via dexie.js). It's a static SPA built with Vite/React/TypeScript, deployed to GitHub Pages at a `/TopHat` base path. Multi-currency support and CSV bank-statement import are core features.

## Commands

-   `yarn dev` — start the dev server (Vite, bound to `0.0.0.0`)
-   `yarn build` — typecheck (`tsc`) then build for production with `--base=/TopHat/`
-   `yarn preview` — preview the production build
-   `yarn test` — run tests (Vitest)
-   `yarn test <path or -t pattern>` — run a single test file or match by name, e.g. `yarn test src/state/data/index.test.ts` or `yarn test -t "State remains valid"`

There is no separate lint script; type errors surface via `tsc` (run as part of `build`). Prettier config is in `.prettierrc.json` (tabWidth 4, printWidth 120) but no format/check script is wired up — format with your editor's Prettier integration or `npx prettier --write`.

Tests use Vitest with a jsdom environment set per-file via `/** @vitest-environment jsdom */` docblocks (see `src/state/data/index.test.ts`).

## Architecture

### State: two Redux slices, both in `src/state/`

-   **`app`** (`src/state/app/`): ephemeral UI state — which page/dialog is open, table filters/sort, etc. Its reducer is wrapped to sync `window.history` with the current page state (`getPagePathForPageState`/`getAppStateFromPagePath` in `src/state/app/index.ts`), so routing is derived from Redux state rather than a router library. Page-specific state shapes live in `pageTypes.ts`; defaults in `defaults.ts`.
-   **`data`** (`src/state/data/`): the actual financial data — accounts, categories, currencies, institutions, rules, statements, transactions, notifications, users, plus a `patches` entity used for undo/history. Each entity type is a `@reduxjs/toolkit` `createEntityAdapter` (see the `adapters` map in `src/state/data/index.ts`), each with its own sort comparer (by name, by index, by date, custom for accounts/categories).

Both slices' reducers are monkey-patched after `createSlice` (reassigning `Slice.reducer`) to add cross-cutting behavior — don't remove this pattern when editing either slice:

-   `data`'s reducer wrapper (`src/state/data/index.ts`) computes an rfc6902 JSON patch of every change, stores it in `state.patches` (pruned after 30 days) to power the settings "history"/rewind feature, and fires a toast notification via `submitNotification`/`rewindDisplaySpec` — a reducer sets `rewindDisplaySpec = { message, ... }` before returning to control the notification text/suppression, since reducers can't call hooks directly.
-   `data` also maintains denormalized rolling caches on every mutation: per-account/currency/category monthly transaction summaries (credits/debits buckets keyed off a rolling `history.start`) and per-account running balances. Any reducer that adds/edits/removes transactions must call the appropriate `update*` helpers (`updateTransactionSummariesWithTransactions`, `updateBalancesAndAccountSummaries`, `updateCategoryTransactionDates`, etc.) to keep these caches consistent — they are not recomputed lazily on read.
-   `app`'s reducer wrapper pushes to `window.history` whenever the computed path changes.

### Persistence and startup (`src/state/logic/`)

-   `database.ts` defines the Dexie (IndexedDB) schema (`TopHatDexie`), one table per entity type (note: `transaction` is stored as `transaction_` because of a Dexie name clash).
-   `startup.ts` orchestrates boot: hydrate Redux from IndexedDB if present, otherwise fall back to demo data (`state/data/demo/`) or an empty tutorial state; wires up bidirectional sync between Redux and IDB (`subscribeToDataUpdates` from `state/data/index.ts` pushes changes to IDB; Dexie's `dexie-observable` change stream can push back).
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
