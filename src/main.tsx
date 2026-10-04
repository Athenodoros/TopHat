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

// The Dropbox sign-in popup comes back to `dropbox.html`, which must stay a static page: booting the
// app there would start a second copy of it, with the authorisation code still on the URL. The service
// worker leaves that URL to the network (see `vite.config.ts`), but anything that serves the app for
// it instead - a service worker installed before that rule was, say - is stopped here.
if (window.location.pathname.endsWith("/dropbox.html")) {
    document.body.textContent = "Signing in to Dropbox… you can close this window if it does not close itself.";
} else {
    // The app renders before boot rather than after it, so that the wait for saved data is a loading
    // page rather than a blank one: what is on screen follows `app.storage` as boot progresses
    const root = createRoot(document.getElementById("root")!);
    root.render(<App />);

    initialiseAndGetDBConnection();
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
