import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The site is served by GitHub Pages at https://ccy5123.github.io/sdl-workflows-explorer/ (SPEC-SITE-001 REQ-015).
// The e2e build keeps a relative base so its preview server, and every Playwright spec, works at the origin root.
export default defineConfig(({ mode }) => ({
  base: mode === "e2e" ? "./" : "/sdl-workflows-explorer/",
  plugins: [react()],
}));
