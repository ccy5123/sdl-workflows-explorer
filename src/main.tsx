import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { storedTheme } from "./components/useTheme";
import { resolveTheme } from "./lib/siteTokens";
import "./styles.css";

// index.html sets data-theme before the first paint; this keeps it in step when the system scheme changes while the
// page is open, unless the visitor chose a theme with the toggle (SPEC-SITE-001 REQ-008; SPEC-UI-001 REQ-005).
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
const applyTheme = () => {
  document.documentElement.dataset.theme = resolveTheme(storedTheme(), darkQuery.matches);
};
applyTheme();
darkQuery.addEventListener("change", applyTheme);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
