import react from "@vitejs/plugin-react-swc";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Vitest picks this up in preference to vite.config.ts. It is kept separate because Vitest bundles
// its own (newer) copy of Vite, which does not typecheck against the plugins in the app config.
export default defineConfig({
    plugins: [react()],
    test: {
        // Under Node, dexie-observable loads its CommonJS build and so picks up a second copy of
        // Dexie (which has conditional exports), which then fights with the app's copy over the
        // BroadcastChannel they use to talk between tabs. Pointing at the ESM build makes Vite
        // resolve both the same way a browser would.
        alias: {
            "dexie-observable": fileURLToPath(
                new URL("./node_modules/dexie-observable/dist/dexie-observable.es.js", import.meta.url)
            ),
        },
    },
});
