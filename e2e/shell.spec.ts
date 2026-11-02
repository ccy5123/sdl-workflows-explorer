// SPEC-UI-001 AC-6, AC-7, AC-11: the top bar, the theme toggle and the self-hosted typefaces, in Chromium against
// the e2e build.
import { expect, test, type Page } from "@playwright/test";
import type { IndexJson } from "../src/data/types";
import { SITE_TOKENS } from "../src/lib/siteTokens";
import { READY, ROUTES } from "./routes";

const rgb = (hex: string) =>
  `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;

const bodyBackground = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

for (const route of ROUTES) {
  test(`AC-6: sticky top bar with the view tabs on ${route.hash}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 700 });
    await page.goto(`/${route.hash}`);
    await expect(page.locator(READY)).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link")).toHaveText([
      "SDL Workflows Explorer", "Home", "Browse", "Trends", "Taxonomy", "Benchmark", "Workflow", "About",
    ]);
    await page.mouse.wheel(0, 1500);
    await expect.poll(() => page.evaluate(() => Math.round(document.querySelector(".topbar")!.getBoundingClientRect().top))).toBe(0);
  });
}

test("AC-6: the version chip links to the release DOI", async ({ page }) => {
  await page.goto("/#/");
  const index = (await page.evaluate(() => fetch("data/index.json").then((r) => r.json()))) as IndexJson;
  const chip = page.locator(".topbar .version-chip");
  await expect(chip).toHaveText(`v${index.release.version}`);
  await expect(chip).toHaveAttribute("href", `https://doi.org/${index.release.doi}`);
});

test("AC-6: at 375 px the tabs sit in their own row below the site name", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/#/");
  await expect(page.locator(READY)).toBeVisible();
  const [title, tabs, toggle] = await Promise.all(
    [".site-title", ".nav-tabs", ".theme-toggle"].map((s) => page.locator(s).boundingBox()),
  );
  expect(tabs!.y).toBeGreaterThanOrEqual(title!.y + title!.height - 1);
  expect(toggle!.x + toggle!.width).toBeLessThanOrEqual(375);
  expect(toggle!.y).toBeLessThan(tabs!.y);
});

test("AC-7: the theme toggle switches, survives a reload and switches back", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/#/");
  await expect(page.locator(READY)).toBeVisible();
  const toggle = page.getByRole("button", { name: "Switch to dark theme" });
  await toggle.click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
  expect(await bodyBackground(page)).toBe(rgb(SITE_TOKENS.dark["--bg"]));

  await page.reload();
  await expect(page.locator(READY)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
  // A stored choice wins over a later change of the system scheme.
  await page.emulateMedia({ colorScheme: "light" });
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");

  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe("light");
  expect(await bodyBackground(page)).toBe(rgb(SITE_TOKENS.light["--bg"]));
});

test("AC-7: the toggle still switches when the browser refuses storage", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("blocked", "SecurityError");
      },
    });
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/#/");
  await expect(page.locator(READY)).toBeVisible();
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
  expect(errors).toEqual([]);
});

test("AC-11: statistics load Latin Modern and ids JetBrains Mono", async ({ page }) => {
  await page.goto("/#/");
  await expect(page.locator(".math").first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const loaded = await page.evaluate(() => ({
    lm: document.fonts.check('16px "Latin Modern Roman"'),
    lmItalic: document.fonts.check('italic 16px "Latin Modern Roman"'),
    mono: document.fonts.check('16px "JetBrains Mono"'),
    mathFamily: getComputedStyle(document.querySelector(".math")!).fontFamily,
    monoFamily: getComputedStyle(document.querySelector(".mono")!).fontFamily,
  }));
  expect(loaded.lm).toBe(true);
  expect(loaded.lmItalic).toBe(true);
  expect(loaded.mono).toBe(true);
  expect(loaded.mathFamily).toMatch(/^"Latin Modern Roman"/);
  expect(loaded.monoFamily).toMatch(/^"JetBrains Mono"/);
});
