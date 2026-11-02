import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { themeFor } from "./lib/siteTokens";
import "./styles.css";

// index.html sets data-theme before the first paint; this keeps it in step when the system scheme changes while the
// page is open (SPEC-SITE-001 REQ-008).
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
const applyTheme = () => {
  document.documentElement.dataset.theme = themeFor(darkQuery.matches);
};
applyTheme();
darkQuery.addEventListener("change", applyTheme);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
