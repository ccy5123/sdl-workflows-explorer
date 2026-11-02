// SPEC-SITE-001 AC-14: the production build served under /sdl-workflows-explorer/ (as GitHub Pages will serve it)
// loads every view and its data; the e2e preview server stays at the origin root.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const PAGES = "http://localhost:4319/sdl-workflows-explorer/";

test("AC-14: the e2e preview server answers at the origin root without a redirect", async ({ request }) => {
  const response = await request.get("/", { maxRedirects: 0 });
  expect(response.status()).toBe(200);
});

test("AC-14: the production index.html loads its scripts under the base path", () => {
  const html = readFileSync(join(import.meta.dirname, "..", "dist-pages", "index.html"), "utf8");
  expect(html).toMatch(/src="\/sdl-workflows-explorer\/assets\/[^"]+\.js"/);
});

for (const hash of ["#/", "#/about", "#/platform/Aand2024/P1", "#/browse", "#/trends", "#/taxonomy", "#/benchmark"]) {
  test(`AC-14: ${hash} under /sdl-workflows-explorer/`, async ({ page }) => {
    const failed: string[] = [];
    page.on("response", (r) => {
      if (r.url().startsWith("http://localhost:4319/") && r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
    });
    page.on("requestfailed", (r) => {
      if (r.url().startsWith("http://localhost:4319/")) failed.push(`failed ${r.url()}`);
    });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${PAGES}${hash}`);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator("footer.site-footer")).toContainText("Data version");
    await page.waitForLoadState("networkidle");
    expect(failed).toEqual([]);
    expect(errors).toEqual([]);
  });
}
