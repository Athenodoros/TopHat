import React from "react";
import ReactDOM from "react-dom";
import { App } from "./components/shell";
import reportWebVitals from "./reportWebVitals";
import { debug } from "./state/logic/debug";
import { startup } from "./state/logic/startup";

debug();
startup();

ReactDOM.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
    document.getElementById("root")
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
