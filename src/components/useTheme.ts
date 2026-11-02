// The current site theme, read from data-theme on <html> (set from prefers-color-scheme by index.html and kept in
// step by main.tsx; SPEC-SITE-001 REQ-008).
import { useEffect, useState } from "react";
import type { Theme } from "../lib/siteTokens";

const read = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

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
