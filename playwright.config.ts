// Playwright runs against `vite preview` of the e2e build (`vite build --mode e2e --outDir dist-e2e`),
// the only build that exposes window.__cy. Run with `npm run e2e`.
import { defineConfig, devices } from "@playwright/test";

const PORT = 4317;

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
  webServer: {
    command: `npx vite preview --outDir dist-e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
