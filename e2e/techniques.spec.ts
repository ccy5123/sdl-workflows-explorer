// SPEC-TECH-001 AC-4: the technique search on Home and Browse (expansion line, the "only" button, reasons with
// evidence, suggestions), the Techniques filter and its URL, the provenance note, and 375 px.
import { expect, test, type Page } from "@playwright/test";
import { SEARCH_LABEL, TECHNIQUE_NOTE } from "../src/lib/siteText";

const hash = (page: Page) => page.evaluate(() => window.location.hash);
const overflowX = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const browseCount = (page: Page) => page.locator('.browse [aria-live="polite"]');
const filterButton = (page: Page, legend: string) =>
  page.locator(".filter-panel").getByRole("button", { name: new RegExp(`^${legend}( · \\d+)?$`) });

test("Home: every spelling finds the IR set, the line says how, and the button searches the spelling only", async ({ page }) => {
  await page.goto("/#/");
  const main = page.locator("main");
  const search = main.getByRole("searchbox", { name: SEARCH_LABEL });
  await search.fill("FTIR");
  await expect(main.locator(".search-count")).toHaveText("19 of 279 platforms match");
  await expect(main.locator(".search-expansion-line")).toContainText("FTIR: searched as IR spectroscopy (");
  await expect(main.locator(".search-expansion .table-note")).toHaveText(TECHNIQUE_NOTE);
  // The reason names the module id, its stated name and the page it was read from.
  await expect(main.locator(".suggestion-reason").first()).toContainText(/IR spectroscopy: \S+\/P\d+\/M\d+ .+ · .+p\. \d+/);
  await search.fill("ReactIR");
  await expect(main.locator(".search-count")).toHaveText("19 of 279 platforms match");

  await search.fill("FTIR");
  await main.getByRole("button", { name: "Search “FTIR” only" }).click();
  await expect(search).toHaveValue('"FTIR"');
  await expect(search).toBeFocused();
  await expect(main.locator(".search-count")).toHaveText("4 of 279 platforms match");
  await expect(main.locator(".search-expansion-line")).toHaveCount(0);
});

test("Home: a query that matches almost nothing offers the closest module names as searches", async ({ page }) => {
  await page.goto("/#/");
  const main = page.locator("main");
  const search = main.getByRole("searchbox", { name: SEARCH_LABEL });
  await search.fill("diffractomter");
  await expect(main.locator(".search-count")).toHaveText("0 of 279 platforms match");
  const offer = main.locator(".search-suggest").getByRole("button", { name: "Bruker D8 Advance diffractometer" });
  await offer.click();
  await expect(search).toHaveValue('"Bruker D8 Advance diffractometer"');
  await expect(main.locator(".search-count")).toHaveText("1 of 279 platforms match");
});

test("Browse: the expansion line, and the only button writes the quoted term into the URL", async ({ page }) => {
  await page.goto("/#/browse?view=platforms&q=ReactIR");
  await expect(browseCount(page)).toHaveText("19 of 279 platforms");
  await expect(page.locator(".search-expansion-line")).toContainText("ReactIR: searched as IR spectroscopy (");
  await page.getByRole("button", { name: "Search “ReactIR” only" }).click();
  await expect(browseCount(page)).toHaveText("9 of 279 platforms");
  expect(await hash(page)).toBe("#/browse?view=platforms&q=%22ReactIR%22");
  await expect(page.locator(".search-expansion-line")).toHaveCount(0);
});

test("Browse: the Techniques filter, its URL and its note", async ({ page }) => {
  await page.goto("/#/browse?view=platforms&tech=ir_spectroscopy");
  await expect(browseCount(page)).toHaveText("19 of 279 platforms");
  await expect(filterButton(page, "Techniques")).toHaveText("Techniques · 1");
  await filterButton(page, "Techniques").click();
  const group = page.getByRole("group", { name: "Techniques", exact: true });
  await expect(group.getByRole("checkbox", { name: /\(ir_spectroscopy\)$/ })).toBeChecked();
  await expect(page.locator(".filter-note")).toHaveText(TECHNIQUE_NOTE);
  await group.getByRole("checkbox", { name: /\(x_ray_diffraction\)$/ }).check();
  await expect(page).toHaveURL(/tech=ir_spectroscopy,x_ray_diffraction/);
  await page.getByRole("group", { name: "Techniques match", exact: true }).getByRole("radio", { name: "any" }).check();
  await expect(browseCount(page)).toHaveText("28 of 279 platforms");
  expect(await hash(page)).toBe("#/browse?view=platforms&tech=ir_spectroscopy,x_ray_diffraction&techMatch=any");
});

test("Browse: a tech value in the URL waits for the tags and is then applied", async ({ page }) => {
  let release: () => void = () => {};
  const held = new Promise<void>((r) => (release = r));
  await page.route("**/data/techniques.json", async (route) => {
    await held;
    await route.continue();
  });
  await page.goto("/#/browse?view=platforms&tech=x_ray_diffraction");
  await expect(browseCount(page)).toHaveText("279 of 279 platforms");
  expect(await hash(page)).toBe("#/browse?view=platforms&tech=x_ray_diffraction");
  release();
  await expect(browseCount(page)).toHaveText("9 of 279 platforms");
  expect(await hash(page)).toBe("#/browse?view=platforms&tech=x_ray_diffraction");
});

test("Trends: the count line follows the technique filter", async ({ page }) => {
  await page.goto("/#/trends?view=platforms&tech=x_ray_diffraction");
  await expect(page.locator('main [aria-live="polite"]')).toHaveText("9 of 279 platforms");
});

test("375 px: no sideways page scroll with the expansion line shown on Home and Browse", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/#/");
  await page.locator("main").getByRole("searchbox", { name: SEARCH_LABEL }).fill("LC-MS");
  await expect(page.locator(".search-expansion-line").first()).toBeVisible();
  expect(await overflowX(page)).toBe(0);
  await page.goto("/#/browse?view=platforms&q=FTIR");
  await expect(page.locator(".search-expansion-line")).toBeVisible();
  expect(await overflowX(page)).toBe(0);
});
