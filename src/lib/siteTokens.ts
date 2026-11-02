// Site colour tokens (SPEC-SITE-001 REQ-008, REQ-009): the light and dark sets that styles.css declares as custom
// properties under :root and :root[data-theme="dark"]; tests/siteTokens.test.ts keeps the two equal and checks
// contrast. The dark background and text equal the dark chart surface and ink (chartTokens.ts). Pure constants.

export type Theme = "light" | "dark";

export const SITE_TOKENS = {
  light: {
    "--bg": "#ffffff",
    "--text": "#1f2328",
    "--muted": "#57606a",
    "--line": "#d0d7de",
    "--panel": "#f6f8fa",
    "--accent": "#0969da",
    "--highlight": "#ddf4ff",
    "--warn": "#b35900",
    "--danger": "#cf222e",
    "--unmapped": "#000000",
  },
  dark: {
    "--bg": "#1a1a19",
    "--text": "#f0efec",
    "--muted": "#b8b7ae",
    "--line": "#4a4a46",
    "--panel": "#242422",
    "--accent": "#6cb4ff",
    "--highlight": "#1d3350",
    "--warn": "#e8a25c",
    "--danger": "#ff7b72",
    "--unmapped": "#f0efec",
  },
} as const satisfies Record<Theme, Record<string, string>>;

/** The theme the system colour scheme asks for. */
export const themeFor = (prefersDark: boolean): Theme => (prefersDark ? "dark" : "light");
