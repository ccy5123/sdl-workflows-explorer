// Site colour tokens (SPEC-SITE-001 REQ-008, REQ-009; SPEC-UI-001 REQ-001, REQ-002): the light and dark sets that
// styles.css declares as custom properties under :root and :root[data-theme="dark"]; tests/siteTokens.test.ts keeps
// the two equal and checks contrast. Values are those of the approved mock, variant B with the indigo accent
// (.moai/specs/SPEC-UI-001/design.md §1). Pure constants.

export type Theme = "light" | "dark";

export const SITE_TOKENS = {
  light: {
    "--bg": "#ffffff",
    "--panel": "#f6f7f9",
    "--card": "#ffffff",
    "--text": "#0e1116",
    "--muted": "#586170",
    "--line": "#e4e7ec",
    "--line-strong": "#cdd2da",
    "--accent": "#4338ca",
    "--accent-ink": "#ffffff",
    "--accent-text": "#3730a3",
    "--highlight": "#eef0ff",
    "--warn": "#b35900",
    "--danger": "#cf222e",
    "--unmapped": "#000000",
  },
  dark: {
    "--bg": "#0b0d12",
    "--panel": "#11141a",
    "--card": "#151922",
    "--text": "#eceef2",
    "--muted": "#a0a8b6",
    "--line": "#252b36",
    "--line-strong": "#363d4a",
    "--accent": "#8c94ff",
    "--accent-ink": "#0b0d12",
    "--accent-text": "#b9beff",
    "--highlight": "#1d2142",
    "--warn": "#e8a25c",
    "--danger": "#ff7b72",
    "--unmapped": "#eceef2",
  },
} as const satisfies Record<Theme, Record<string, string>>;

/** The theme the system colour scheme asks for. */
export const themeFor = (prefersDark: boolean): Theme => (prefersDark ? "dark" : "light");

/** localStorage key of the visitor's theme choice (SPEC-UI-001 REQ-005). */
export const THEME_STORAGE_KEY = "sdl-theme";

/** The theme to show: the stored choice when it is a theme, else the system scheme. */
export const resolveTheme = (stored: string | null, prefersDark: boolean): Theme =>
  stored === "light" || stored === "dark" ? stored : themeFor(prefersDark);
