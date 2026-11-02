// The current site theme, read from data-theme on <html> (set by index.html and kept in step by main.tsx;
// SPEC-SITE-001 REQ-008), and the visitor's stored choice (SPEC-UI-001 REQ-005).
import { useEffect, useState } from "react";
import { THEME_STORAGE_KEY, type Theme } from "../lib/siteTokens";

const read = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

/** The theme the visitor chose with the toggle, or null; null too when the browser refuses storage. */
export function storedTheme(): string | null {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Shows `theme` now and remembers it in this browser when storage is allowed. */
export function chooseTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage refused (private window, blocked site data): the switch still holds for the open page.
  }
}

export function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(read);
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(read()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    setTheme(read());
    return () => observer.disconnect();
  }, []);
  return theme;
}
