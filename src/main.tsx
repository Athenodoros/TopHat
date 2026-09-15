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
import { getMaybeDropboxRedirectCode } from "./state/logic/dropbox";
import { initialiseAndGetDBConnection } from "./state/logic/startup";

// AppSlice rewrites the URL as soon as any action runs through its reducer, and the app can dispatch
// actions once it has rendered, so the Dropbox redirect code has to be read before anything else
const maybeDropboxCode = getMaybeDropboxRedirectCode();

// The app renders before boot rather than after it, so that the wait for saved data is a loading
// page rather than a blank one: what is on screen follows `app.storage` as boot progresses
const root = createRoot(document.getElementById("root")!);
root.render(<App />);

initialiseAndGetDBConnection(maybeDropboxCode);

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
