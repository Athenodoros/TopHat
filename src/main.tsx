import "@fontsource/roboto/300-italic.css";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400-italic.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import React from "react";
import ReactDOM from "react-dom";
import { registerSW } from "virtual:pwa-register";
import { App } from "./app";
import { setPopupAlert } from "./app/popups";
import { initialiseAndGetDBConnection } from "./state/logic/startup";

initialiseAndGetDBConnection().then(() => {
    ReactDOM.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>,
        document.getElementById("root")
    );
});

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
    });
}
