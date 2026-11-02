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

// SPEC-UI-001 AC-14: below 800 px the tabs collapse into a menu (REQ-016).
const VIEW_LINKS = ["Home", "Browse", "Trends", "Taxonomy", "Benchmark", "Workflow", "About"];

const pageOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test("AC-14: at 375 px a menu button replaces the tabs in one row", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/#/");
  await expect(page.locator(READY)).toBeVisible();
  await expect(page.locator(".nav-tabs")).toBeHidden();
  const button = page.getByRole("button", { name: "Menu" });
  await expect(button).toBeVisible();
  await expect(button).toHaveAttribute("aria-expanded", "false");
  const [title, toggle, menu] = await Promise.all(
    [".site-title", ".theme-toggle", ".menu-button"].map((s) => page.locator(s).boundingBox()),
  );
  for (const box of [toggle!, menu!]) {
    expect(Math.abs(box.y + box.height / 2 - (title!.y + title!.height / 2))).toBeLessThan(4);
    expect(box.x + box.width).toBeLessThanOrEqual(375);
  }
  expect(await pageOverflow(page)).toBe(0);
});

test("AC-14: the menu opens with every view, moves focus in, navigates and closes", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/#/");
  await expect(page.locator(READY)).toBeVisible();
  const mainTop = await page.locator("main").evaluate((m) => m.getBoundingClientRect().top);
  const button = page.getByRole("button", { name: "Menu" });
  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  const panel = page.locator(`#${await button.getAttribute("aria-controls")}`);
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("link")).toHaveText(VIEW_LINKS);
  await expect(panel.locator('[aria-current="page"]')).toHaveText("Home");
  await expect(panel.getByRole("link", { name: "Home" })).toBeFocused();
  // The panel floats over the page: nothing below the top bar moves.
  expect(await page.locator("main").evaluate((m) => m.getBoundingClientRect().top)).toBe(mainTop);
  expect(await pageOverflow(page)).toBe(0);

  await panel.getByRole("link", { name: "Trends" }).click();
  await expect(page).toHaveURL(/#\/trends$/);
  await expect(panel).toBeHidden();
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(button).toBeFocused();

  await button.click();
  await expect(panel.locator('[aria-current="page"]')).toHaveText("Trends");
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(button).toBeFocused();

  await button.click();
  await expect(panel).toBeVisible();
  await page.mouse.click(180, 600);
  await expect(panel).toBeHidden();

  await button.click();
  await expect(panel).toBeVisible();
  await page.evaluate(() => (window.location.hash = "#/about"));
  await expect(page.locator("main h1")).toHaveText("About the data");
  await expect(panel).toBeHidden();
  expect(await pageOverflow(page)).toBe(0);
});

test("AC-14: at 800 px and above the tabs stay and the menu button is hidden", async ({ page }) => {
  for (const width of [799, 800, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/#/");
    await expect(page.locator(READY)).toBeVisible();
    const wide = width >= 800;
    await expect(page.locator(".nav-tabs"), `${width} px`).toBeVisible({ visible: wide });
    await expect(page.locator(".menu-button"), `${width} px`).toBeVisible({ visible: !wide });
    if (wide) {
      // Every tab is shown in one row: the tab list does not scroll and the bar keeps its single-row height.
      const { scroll, client, bar } = await page.evaluate(() => {
        const tabs = document.querySelector(".nav-tabs")!;
        return { scroll: tabs.scrollWidth, client: tabs.clientWidth, bar: document.querySelector(".topbar")!.getBoundingClientRect().height };
      });
      expect(scroll, `${width} px`).toBeLessThanOrEqual(client);
      expect(bar, `${width} px`).toBeLessThan(72);
    }
  }
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
