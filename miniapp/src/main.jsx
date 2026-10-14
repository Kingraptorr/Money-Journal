import React from "react";
import { createRoot } from "react-dom/client";
import WebApp from "@twa-dev/sdk";
import App from "./App.jsx";
import { WebRoot } from "./web/WebRoot.jsx";
import "./index.css";

const insideTelegram = Boolean(WebApp.initData);

if (insideTelegram) {
  WebApp.ready();
  WebApp.expand();
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>{insideTelegram ? <App /> : <WebRoot />}</React.StrictMode>,
);
