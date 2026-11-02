// Theme toggle of the top bar (SPEC-UI-001 REQ-005): switches between the light and dark sets and remembers the
// choice in this browser.
import { Moon, Sun } from "lucide-react";
import { chooseTheme, useTheme } from "./useTheme";

export function ThemeToggle() {
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className="btn btn-icon theme-toggle"
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      onClick={() => chooseTheme(next)}
    >
      {theme === "dark" ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
    </button>
  );
}
