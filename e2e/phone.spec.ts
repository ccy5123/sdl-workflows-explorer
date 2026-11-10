// Phone layouts at 375 px: Trends chart first with "Split by" as a select, the builder's folding rows, the About
// contents, Home's top-to-bottom module chain and ways in, and the focus view of the platform graph.
import { expect, test, type Page } from "@playwright/test";

const main = (page: Page) => page.locator("main");
const overflowX = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const sheet = (page: Page) => page.getByRole("complementary", { name: "Evidence" });

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
});

test("Trends: the chart is on the first screen, Split by is a select, year labels are level and short", async ({ page }) => {
  await page.goto("/#/trends");
  const chart = main(page).locator(".trends-chart svg");
  await expect(chart).toBeVisible();
  expect((await chart.boundingBox())!.y).toBeLessThan(812);
  await expect(main(page).getByRole("radio")).toHaveCount(0);
  const split = main(page).getByLabel("Split by");
  await expect(split).toHaveValue("im");
  const ticks = await chart.locator('g[data-mark="x-axis tick label"] text').evaluateAll((ts) =>
    ts.map((t) => ({ text: t.textContent, turned: (t.getAttribute("transform") ?? "").includes("rotate") })),
  );
  expect(ticks.some((t) => t.text === "'16")).toBe(true);
  expect(ticks.every((t) => !t.turned)).toBe(true);
  await expect(main(page).locator("details.trends-about > summary")).toHaveText("About this chart");
  // The table under the chart turns: years down the side.
  await main(page).locator(".trends-table-details > summary").click();
  await expect(main(page).locator("table.count-table-turned tbody th").first()).toHaveText(/before/);
  await split.selectOption("mt");
  await expect.poll(() => page.evaluate(() => window.location.hash)).toContain("split=mt");
  expect(await overflowX(page)).toBe(0);
});

test("Workflow builder: modules, steps and transfers are summary rows that open in place; parts fold", async ({ page }) => {
  await page.goto("/#/workflow");
  await main(page).getByLabel("Start from a coded platform").selectOption("Aand2024/P1");
  await main(page).getByRole("button", { name: "Fill the builder from this platform" }).click();
  const row = main(page).getByRole("button", { name: /^Module 2: Flow reactor, 1 device$/ });
  await expect(row).toHaveAttribute("aria-expanded", "false");
  await expect(main(page).getByLabel("Module 2 type")).toHaveCount(0);
  await row.click();
  await expect(main(page).getByLabel("Module 2 type")).toBeVisible();
  await main(page).getByLabel("Module 2 type").selectOption("batch_reactor");
  await expect(main(page).getByRole("button", { name: /^Module 2: Batch reactor/ })).toBeVisible();
  // A step opens its fields; the order buttons stay on the folded row.
  await expect(main(page).getByRole("button", { name: "Move step 2 up" })).toBeVisible();
  await main(page).getByRole("button", { name: /^Step 2: / }).click();
  await expect(main(page).getByLabel("Step 2 unit operation")).toBeVisible();
  // A part folds under its heading, with its count beside the name.
  const steps = main(page).getByRole("button", { name: /^Steps 6 steps/ });
  await steps.click();
  await expect(steps).toHaveAttribute("aria-expanded", "false");
  await expect(main(page).locator(".wf-steps")).toHaveCount(0);
  expect(await overflowX(page)).toBe(0);
});

test("About: 16 px body text and a contents list that scrolls to each section", async ({ page }) => {
  await page.goto("/#/about");
  const nav = main(page).getByRole("navigation", { name: "On this page" });
  await expect(nav).toBeVisible();
  expect(await main(page).locator(".about > section p").first().evaluate((p) => getComputedStyle(p).fontSize)).toBe("16px");
  await nav.getByRole("button", { name: "Limits" }).click();
  await expect(main(page).getByRole("heading", { name: "Limits", level: 2 })).toBeFocused();
  expect(await page.evaluate(() => window.location.hash)).toBe("#/about");
});

test("Home: the featured modules run top to bottom; the ways in are rows without previews", async ({ page }) => {
  await page.goto("/#/");
  await expect(main(page).locator(".fp-chain .fp-module").first()).toBeVisible();
  const boxes = await main(page).locator(".fp-chain .fp-module").evaluateAll((ms) => ms.map((m) => m.getBoundingClientRect()).map((r) => ({ x: r.x, y: r.y })));
  expect(boxes.length).toBeGreaterThan(1);
  for (let i = 1; i < boxes.length; i++) expect(boxes[i]!.y).toBeGreaterThan(boxes[i - 1]!.y);
  await expect(main(page).locator(".view-card-preview").first()).toBeHidden();
  const small = await main(page).evaluate((m) =>
    [...m.querySelectorAll<HTMLElement>("*")].filter((el) => {
      if (!el.offsetParent || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())) return false;
      return parseFloat(getComputedStyle(el).fontSize) < 13;
    }).map((el) => el.className || el.tagName),
  );
  expect(small).toEqual([]);
  expect(await overflowX(page)).toBe(0);
});

test("Platform viewer: the focus view centres a module, walks to neighbours and opens evidence", async ({ page }) => {
  await page.goto("/#/platform/Kim2026/P1");
  const view = main(page).locator(".focus-graph");
  await expect(view).toBeVisible();
  await expect(main(page).locator(".graph")).toHaveCount(0);
  // It starts on the module with the most connections.
  const chips = view.getByRole("group", { name: "Module in the middle" });
  await expect(chips.getByRole("button", { pressed: true })).toHaveText(/Human\s*M4/);
  // A neighbour moves the middle without opening the evidence.
  await view.getByRole("button", { name: "Batch reactor M2: put it in the middle" }).click();
  await expect(chips.getByRole("button", { pressed: true })).toHaveText(/Batch reactor\s*M2/);
  await expect(sheet(page)).toHaveCount(0);
  await expect(view.getByRole("heading", { name: "Connections of Batch reactor M2" })).toBeVisible();
  // The middle module opens its evidence; so does a connection row.
  await view.getByRole("button", { name: "Batch reactor M2: show its evidence" }).click();
  await expect(sheet(page).locator('[data-field="id"]')).toHaveText("Kim2026/P1/M2");
  await page.keyboard.press("Escape");
  await view.locator(".focus-list button").first().click();
  await expect(sheet(page).locator('[data-field="kind"]')).toHaveText("Connection");
  await page.keyboard.press("Escape");
  // Names are 14 px or larger.
  const sizes = await view.locator(".focus-name").evaluateAll((ts) => ts.map((t) => parseFloat(getComputedStyle(t).fontSize)));
  expect(Math.min(...sizes)).toBeGreaterThanOrEqual(14);
  // The tables are cards.
  expect(await main(page).locator('[data-table="modules"] tbody tr').first().evaluate((tr) => getComputedStyle(tr).display)).toBe("flex");
  // "Whole graph" opens the force graph on the whole screen and gives focus back when it closes.
  const whole = view.getByRole("button", { name: "Whole graph", exact: true });
  await whole.click();
  const dialog = page.getByRole("dialog", { name: "Whole graph" });
  await expect(dialog.locator(".graph")).toBeVisible();
  const box = (await dialog.boundingBox())!;
  expect([box.x, box.y, box.width, box.height]).toEqual([0, 0, 375, 812]);
  await dialog.getByRole("button", { name: "Close whole graph" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(whole).toBeFocused();
  expect(await overflowX(page)).toBe(0);
});

test("Platform viewer: a step chosen in the timeline brings its module to the middle", async ({ page }) => {
  await page.goto("/#/platform/Kim2026/P1");
  const view = main(page).locator(".focus-graph");
  await expect(view).toBeVisible();
  await main(page).locator('.step[data-step-order="1"]').click();
  await expect(view.getByRole("group", { name: "Module in the middle" }).getByRole("button", { pressed: true })).toHaveText(/Liquid handler\s*M1/);
});
