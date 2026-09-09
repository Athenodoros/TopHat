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
    base: "/TopHat",
});
