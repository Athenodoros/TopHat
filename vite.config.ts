import react from "@vitejs/plugin-react-swc";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// personal-storage-wrapper is installed from git and ships TypeScript source rather than a build,
// so the import has to be pointed at the entry inside the repo it was cloned from
export const PERSONAL_STORAGE_WRAPPER_ENTRY = fileURLToPath(
    new URL("./node_modules/personal-storage-wrapper/personal-storage-wrapper/src/main.ts", import.meta.url)
);

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            workbox: {
                globPatterns: ["**/*.{js,css,html,png,woff2,svg}"],
                // The Dropbox popup lands here, and must get the static page rather than the app
                navigateFallbackDenylist: [/\/dropbox\.html/],
            },
        }),
    ],
    resolve: { alias: { "personal-storage-wrapper": PERSONAL_STORAGE_WRAPPER_ENTRY } },

    /**
     * The alias above points into `node_modules`, so the dependency pre-bundler treats the library
     * as a dependency and bundles it - from the package entry rather than through the alias, and the
     * package root has no entry to speak of. What it produced was missing exports the source has, so
     * the app failed to load against a cache that had been rebuilt only moments before.
     *
     * Excluding it leaves the aliased TypeScript source to be transformed like the rest of the app,
     * which is what the alias was for, and takes the stale-cache problem with it: there is no cached
     * copy of the library to go stale after the pinned commit moves.
     */
    optimizeDeps: { exclude: ["personal-storage-wrapper"] },
    base: "/TopHat",
});
