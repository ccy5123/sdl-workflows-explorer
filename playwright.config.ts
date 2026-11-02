// Playwright runs against `vite preview` of the e2e build (`vite build --mode e2e --outDir dist-e2e`), the only build
// that exposes window.__cy, at the origin root. e2e/pages.spec.ts also opens the production build (`vite build
// --outDir dist-pages`) under /sdl-workflows-explorer/, as GitHub Pages serves it (SPEC-SITE-001 REQ-015). Each
// preview server is pinned to its mode, because `vite preview` takes `base` from the config of its mode.
// Run with `npm run e2e`.
import { defineConfig, devices } from "@playwright/test";

const PORT = 4317;
const PAGES_PORT = 4319;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}/`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `npx vite preview --mode e2e --outDir dist-e2e --port ${PORT} --strictPort`,
      url: `http://localhost:${PORT}/`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npx vite preview --mode production --outDir dist-pages --port ${PAGES_PORT} --strictPort`,
      url: `http://localhost:${PAGES_PORT}/sdl-workflows-explorer/`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
