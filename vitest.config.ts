import react from "@vitejs/plugin-react-swc";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Vitest picks this up in preference to vite.config.ts. It is kept separate because Vitest bundles
// its own (newer) copy of Vite, which does not typecheck against the plugins in the app config.
export default defineConfig({
    plugins: [react()],
    test: {
        setupFiles: ["./vitest.setup.ts"],

        // personal-storage-wrapper is installed from git and ships TypeScript source, so the import
        // is pointed at the entry inside the repo it was cloned from
        alias: {
            "personal-storage-wrapper": fileURLToPath(
                new URL("./node_modules/personal-storage-wrapper/personal-storage-wrapper/src/main.ts", import.meta.url)
            ),
        },
        server: {
            // Transformed rather than loaded as an external dependency, so that `vi.resetModules()`
            // gives each boot in a test file its own copy of the library, the way a new tab would
            deps: { inline: ["personal-storage-wrapper"] },
        },
    },
});
