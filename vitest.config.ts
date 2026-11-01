import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // Playwright specs live in e2e/ and run with `npm run e2e`, not Vitest.
    exclude: ["e2e/**", "node_modules/**"],
    environment: "node",
    testTimeout: 60_000,
    coverage: {
      provider: "v8",
      include: ["scripts/**/*.ts", "src/lib/**/*.ts"],
      reporter: ["text"],
    },
  },
});
