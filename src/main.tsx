import "@fontsource/roboto/300-italic.css";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400-italic.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./app";
import { setPopupAlert } from "./app/popups";
import { initialiseAndGetDBConnection } from "./state/logic/startup";

// The Dropbox popup comes back to this page, and it must stay a static page: booting the app here
// would start a second copy of it with the authorisation code still on the URL. The service worker
// serves index.html for any navigation it has no precache entry for, and a `?code=` query means
// this URL is not one, so the check has to be here as well as in the workbox denylist.
if (window.location.pathname.endsWith("/dropbox.html")) {
    document.body.textContent = "Signing in to Dropbox… you can close this window if it does not close itself.";
} else {
    initialiseAndGetDBConnection().then(() => {
        const root = createRoot(document.getElementById("root")!);
        root.render(<App />);
    });
}

if ("serviceWorker" in navigator) {
    // && !/localhost/.test(window.location)) {
    const updateSW = registerSW({
        onNeedRefresh: () =>
            setPopupAlert({
                message: "New version available!",
                severity: "info",
                duration: null,
                action: {
                    name: "Refresh",
                    callback: () => updateSW(),
                },
            }),
        onOfflineReady: () =>
            setPopupAlert({ message: "App ready for offline use!", severity: "info", duration: null }),
    });
}
