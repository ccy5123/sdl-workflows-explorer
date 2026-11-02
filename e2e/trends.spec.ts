// SPEC-TRENDS-001 AC-3 (inverted inputs) and AC-9 to AC-16: the trends dashboard in Chromium against the e2e build.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { PINNED_DOI } from "../tests/pinned-release";

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

const countLine = (page: Page) => page.locator('main [aria-live="polite"]');
const hash = (page: Page) => page.evaluate(() => window.location.hash);
const group = (page: Page, name: string) => page.getByRole("group", { name, exact: true });
const link = (page: Page, name: string) => page.getByRole("link", { name, exact: true });
const splitRadio = (page: Page, name: string) => group(page, "Split by").getByRole("radio", { name, exact: true });
const unitButton = (page: Page, name: string) => group(page, "Unit counted").getByRole("button", { name, exact: true });
const chart = (page: Page) => page.locator(".trends-chart svg");
/** A link inside the chart (the table under the chart repeats the same names). */
const chartLink = (page: Page, name: string) => chart(page).getByRole("link", { name, exact: true });
const xTicks = (page: Page) => chart(page).locator('g[aria-label="x-axis tick label"] text').allTextContents();
const legend = (page: Page) => page.locator(".trends-legend li");
const style = (el: Locator, prop: string) => el.evaluate((e, p) => getComputedStyle(e).getPropertyValue(p), prop);
const BINS = ["before 2015", ...Array.from({ length: 11 }, (_, i) => String(2015 + i)), "2026*"];
const N_PAPERS = ["27", "4", "5", "3", "12", "7", "16", "17", "18", "26", "27", "39", "36"];

async function tabUntil(page: Page, check: () => boolean, max = 300) {
  for (let n = 0; n < max; n++) {
    await page.keyboard.press("Tab");
    if (await page.evaluate(check)) return;
  }
  throw new Error(`Tab did not reach the target within ${max} presses`);
}

test("AC-9: route, navigation and split control", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  const nav = page.getByRole("navigation");
  await expect(nav.getByRole("link")).toHaveText(["SDL Workflows Explorer", "Home", "Browse", "Trends", "Taxonomy", "Benchmark", "Workflow", "About"]);
  await nav.getByRole("link", { name: "Trends", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Trends", level: 1 })).toBeVisible();
  await expect(splitRadio(page, "Integration mode")).toBeChecked();
  await expect(group(page, "Split by").getByRole("radio")).toHaveCount(6);
  expect(await group(page, "Split by").getByRole("radio").evaluateAll((rs) => rs.map((r) => r.parentElement!.textContent))).toEqual([
    "Integration mode", "Field tag", "Software autonomy", "Hardware autonomy", "Module types", "Transfer modes",
  ]);
  await expect(unitButton(page, "Papers")).toHaveAttribute("aria-pressed", "true");
  await expect(countLine(page)).toHaveText("237 of 237 papers");
  expect(await hash(page)).toBe("#/trends");
  const length = await page.evaluate(() => history.length);

  await splitRadio(page, "Module types").check();
  expect(await hash(page)).toBe("#/trends?split=mt");
  await expect(page.locator("table.count-table")).toBeVisible();
  await splitRadio(page, "Integration mode").check();
  expect(await hash(page)).toBe("#/trends");
  expect(await page.evaluate(() => history.length)).toBe(length);

  await page.goto("/#/trends?split=im&view=papers");
  await expect(countLine(page)).toHaveText("237 of 237 papers");
  expect(await hash(page)).toBe("#/trends");

  await page.goto("/#/trends?split=hw");
  await expect(splitRadio(page, "Hardware autonomy")).toBeChecked();
  await nav.getByRole("link", { name: "Trends", exact: true }).click();
  await expect(splitRadio(page, "Integration mode")).toBeChecked();
  expect(await hash(page)).toBe("#/trends");
  expect(errors).toEqual([]);
});

test("AC-10: unit switch, filters and the filter toggle", async ({ page }) => {
  await page.goto("/#/trends");
  await unitButton(page, "Platforms").click();
  await expect(countLine(page)).toHaveText("279 of 279 platforms");
  expect(await hash(page)).toBe("#/trends?view=platforms");
  const line = page.getByText("Platforms carry the first public year, field tags, integration mode and autonomy of their paper.", { exact: true });
  await expect(line).toBeVisible();
  await unitButton(page, "Papers").click();
  await expect(line).toHaveCount(0);

  await page.goto("/#/trends?view=platforms&years=2018-2024&field=catalysis&split=mt");
  await expect(page.getByLabel("From", { exact: true })).toHaveValue("2018");
  await expect(page.getByLabel("To", { exact: true })).toHaveValue("2024");
  await expect(group(page, "Field tag").getByRole("checkbox", { name: "catalysis", exact: true })).toBeChecked();
  await expect(splitRadio(page, "Module types")).toBeChecked();
  await expect(countLine(page)).toHaveText("11 of 279 platforms");
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(countLine(page)).toHaveText("279 of 279 platforms");
  expect(await hash(page)).toBe("#/trends?view=platforms&split=mt");
  await expect(splitRadio(page, "Module types")).toBeChecked();
  await expect(unitButton(page, "Papers")).toBeVisible();
  await expect(unitButton(page, "Platforms")).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/#/trends?years=2018-2024&field=catalysis");
  const toggle = page.locator(".filter-toggle");
  await expect(toggle).toHaveText("Filters (2 active)");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(chart(page)).toBeVisible();
  const panel = (await page.locator(".filter-panel").boundingBox())!;
  const plot = (await page.locator(".trends-chart").boundingBox())!;
  expect(panel.x + panel.width).toBeLessThan(plot.x);

  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/#/trends");
  await page.reload();
  await expect(toggle).toHaveText("Filters (0 active)");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".filter-panel")).toBeHidden();
  await toggle.click();
  await expect(page.locator(".filter-panel")).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
});

test("AC-3: inverted year inputs apply no range", async ({ page }) => {
  await page.goto("/#/trends");
  await page.getByLabel("From", { exact: true }).pressSequentially("2020");
  await page.getByLabel("To", { exact: true }).pressSequentially("2018");
  await expect(page.getByText("From year is after To year")).toBeVisible();
  await expect(countLine(page)).toHaveText("237 of 237 papers");
  await expect.poll(() => xTicks(page)).toEqual(BINS);
  expect(await hash(page)).not.toContain("years");
});

test("AC-11: cross links show equal count lines", async ({ page }) => {
  await page.goto("/#/browse?years=2018-2024&field=catalysis");
  await expect(countLine(page)).toHaveText("11 of 237 papers");
  await expect(link(page, "Show these in Trends")).toHaveAttribute("href", "#/trends?years=2018-2024&field=catalysis");
  await link(page, "Show these in Trends").click();
  await expect(page.getByRole("heading", { name: "Trends", level: 1 })).toBeVisible();
  await expect(countLine(page)).toHaveText("11 of 237 papers");

  await splitRadio(page, "Module types").check();
  await unitButton(page, "Platforms").click();
  expect(await hash(page)).toBe("#/trends?view=platforms&years=2018-2024&field=catalysis&split=mt");
  await expect(countLine(page)).toHaveText("11 of 279 platforms");
  await expect(link(page, "Show these in Browse")).toHaveAttribute("href", "#/browse?view=platforms&years=2018-2024&field=catalysis");
  await link(page, "Show these in Browse").click();
  await expect(page.getByRole("heading", { name: "Browse", level: 1 })).toBeVisible();
  await expect(countLine(page)).toHaveText("11 of 279 platforms");

  await page.goto("/#/browse?view=platforms&im=mixed&mt=flow_reactor");
  await expect(countLine(page)).toHaveText("27 of 279 platforms");
  await link(page, "Show these in Trends").click();
  await expect(page.getByRole("heading", { name: "Trends", level: 1 })).toBeVisible();
  await expect(countLine(page)).toHaveText("27 of 279 platforms");

  await page.goto("/#/trends?im=mixed&mt=flow_reactor");
  await expect(countLine(page)).toHaveText("18 of 237 papers");
  await link(page, "Show these in Browse").click();
  await expect(page.getByRole("heading", { name: "Browse", level: 1 })).toBeVisible();
  await expect(countLine(page)).toHaveText("18 of 237 papers");
});

test("AC-12: bar chart, segment and bin-total links, legend", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/#/trends");
  const segment = chartLink(page, "2021, fixed_tubing: 9 of 17 papers");
  await expect(segment).toHaveAttribute("href", "#/browse?years=2021-2021&im=fixed_tubing");
  await expect(segment.locator("title")).toHaveText("2021, fixed_tubing: 9 of 17 papers");
  expect(await style(segment.locator("rect"), "fill")).toBe("rgb(42, 120, 214)");

  const fixed = (await segment.locator("rect").boundingBox())!;
  const human = (await chartLink(page, "2021, human_transfer: 1 of 17 papers").locator("rect").boundingBox())!;
  expect(fixed.y).toBeGreaterThan(human.y);

  expect(await chart(page).locator('g[aria-label="text"] text').allTextContents()).toEqual(N_PAPERS);
  expect(await chart(page).locator('g[aria-label="text"] a').count()).toBe(13);
  await expect(chartLink(page, "2021: 17 papers")).toHaveAttribute("href", "#/browse?years=2021-2021");
  await expect(chart(page).locator('g[aria-label="y-axis label"] text')).toHaveText("Papers");
  await expect(chart(page).locator('g[aria-label="x-axis label"] text')).toHaveText("First public year");
  const yTicks = await chart(page).locator('g[aria-label="y-axis tick label"] text').allTextContents();
  expect(yTicks.length).toBeGreaterThan(1);
  for (const t of yTicks) expect(t).toMatch(/^\d+$/);
  expect(await xTicks(page)).toEqual(BINS);

  await expect(legend(page)).toHaveText(["fixed_tubing", "human_transfer", "mixed", "mobile_robot", "none", "robot_arm_gantry", "unmapped"]);
  await expect(legend(page).locator(".legend-swatch")).toHaveCount(7);

  await page.locator(".trends-table-details summary").click();
  const rows = page.locator(".trends-table-details tbody tr");
  await expect(rows.nth(0)).toHaveText(["n", ...N_PAPERS].join(""));
  await expect(rows.nth(1).locator("td")).toHaveText(["15", "2", "4", "1", "11", "4", "8", "9", "9", "10", "9", "9", "8"]);
  await expect(rows.nth(1).locator("th")).toHaveText("fixed_tubing");

  await segment.click();
  expect(await hash(page)).toBe("#/browse?years=2021-2021&im=fixed_tubing");
  await expect(countLine(page)).toHaveText("9 of 237 papers");

  await page.goto("/#/trends");
  await chartLink(page, "2021: 17 papers").click();
  await expect(countLine(page)).toHaveText("17 of 237 papers");

  await page.goto("/#/trends?view=platforms");
  await expect(chartLink(page, "2024: 36 platforms")).toHaveAttribute("href", "#/browse?view=platforms&years=2024-2024");
  await chartLink(page, "2024, robot_arm_gantry: 2 of 36 platforms").click();
  await expect(countLine(page)).toHaveText("2 of 279 platforms");

  await page.goto("/#/trends?split=hw");
  await expect(legend(page)).toHaveText([
    "1 — a device doing one kind of task",
    "2 — a workflow joining several tasks",
    "3 — a fully automated laboratory running varied experiments without human intervention",
  ]);
  const hw3 = chartLink(page, "2022, 3 — a fully automated laboratory running varied experiments without human intervention: 1 of 18 papers");
  await expect(hw3).toHaveAttribute("href", "#/browse?years=2022-2022&hw=3");
  await hw3.click();
  await expect(countLine(page)).toHaveText("1 of 237 papers");

  await page.goto("/#/trends?split=sw");
  await expect(chartLink(page, "2021, 2 — closed-loop iteration in which results choose the next experiment: 17 of 17 papers")).toHaveAttribute(
    "href",
    "#/browse?years=2021-2021&sw=2",
  );

  await page.goto("/#/trends?im=mixed");
  await expect(legend(page)).toHaveText(["mixed"]);
  expect(await style(chartLink(page, "2021, mixed: 3 of 3 papers").locator("rect"), "fill")).toBe("rgb(27, 175, 122)");
  expect(errors).toEqual([]);
});

test("AC-13: count table as chart, cell links and shading", async ({ page }) => {
  await page.goto("/#/trends?split=field");
  const table = page.locator("table.count-table");
  await expect(table.locator('thead th[scope="col"]')).toHaveText(BINS);
  await expect(table.locator("tbody tr").nth(0)).toHaveText(["n", ...N_PAPERS].join(""));
  await expect(table.locator("tbody tr")).toHaveCount(10);
  await expect(
    page.getByText(
      "Papers by first public year and field tag. Each cell is the number of papers matching the filters that were first public in that year and have the field tag; n is the number of matching papers first public in that year. A paper can have several field tags, so a column does not add up to n.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(await table.evaluate((t) => getComputedStyle(t.parentElement!).overflowX)).toBe("auto");

  const nano = link(page, "2025, nanomaterials: 16 of 39 papers");
  await expect(nano).toHaveText("16");
  expect(await style(nano.locator(".."), "background-color")).toBe("rgb(13, 54, 107)");
  expect(await style(nano, "color")).toBe("rgb(255, 255, 255)");
  const zero = link(page, "2015, analytical_chemistry: 0 of 4 papers");
  await expect(zero).toHaveText("0");
  expect(await style(zero.locator(".."), "background-color")).toBe("rgba(0, 0, 0, 0)");
  expect(await style(zero, "color")).toBe("rgb(11, 11, 11)");
  await expect(link(page, "2025: 39 papers")).toHaveAttribute("href", "#/browse?years=2025-2025");

  await nano.click();
  expect(await hash(page)).toBe("#/browse?years=2025-2025&field=nanomaterials");
  await expect(countLine(page)).toHaveText("16 of 237 papers");

  await page.goto("/#/trends?view=platforms&split=mt");
  await link(page, "2025, flow_reactor: 10 of 41 platforms").click();
  await expect(countLine(page)).toHaveText("10 of 279 platforms");
});

test("AC-14: partial year, notes, data card link, no percentages", async ({ page }) => {
  await page.goto("/#/trends");
  await expect.poll(async () => (await xTicks(page)).at(-1)).toBe("2026*");
  await expect(page.getByText("* 2026 is partial: the search ran on 20 October 2026.", { exact: true })).toBeVisible();
  await expect(page.locator(".trends > .trends-note")).toHaveText(
    "The counts cover the 237 papers (279 platforms) that passed the screening described in the data card (DATA_CARD.md in the release files on Zenodo), not every paper on self-driving laboratories.",
  );
  await expect(link(page, "release files on Zenodo")).toHaveAttribute("href", `https://doi.org/${PINNED_DOI}`);

  await page.goto("/#/trends?years=2016-2020");
  await expect(countLine(page)).toHaveText("43 of 237 papers");
  await expect.poll(() => xTicks(page)).toEqual(["2016", "2017", "2018", "2019", "2020"]);
  await expect(page.getByText("2026*")).toHaveCount(0);
  await expect(page.getByText(/is partial/)).toHaveCount(0);

  for (const h of ["#/trends", "#/trends?split=field", "#/trends?view=platforms&split=mt"]) {
    await page.goto(`/${h}`);
    await expect(countLine(page)).toBeVisible();
    expect(await page.locator(".trends").innerText()).not.toContain("%");
  }
});

test("AC-15: the dashboard and Plot load in a lazy chunk", async ({ page }) => {
  const requested: string[] = [];
  const bodies: Promise<string>[] = [];
  page.on("request", (r) => requested.push(new URL(r.url()).pathname));
  const onResponse = (r: import("@playwright/test").Response) => {
    if (new URL(r.url()).pathname.endsWith(".js")) bodies.push(r.text());
  };
  page.on("response", onResponse);
  await page.goto("/#/");
  await expect(page.locator(".stat-tiles")).toBeVisible();
  page.off("response", onResponse);
  // A string only Plot's code holds: the default class name it gives its SVG (recorded in progress.md §E.2).
  for (const body of await Promise.all(bodies)) expect(body).not.toContain("plot-d6a7b5");
  expect(bodies.length).toBeGreaterThan(0);

  await page.goto("/#/browse");
  await expect(countLine(page)).toHaveText("237 of 237 papers");
  expect(requested.filter((p) => /\/Trends[^/]*\.js$/.test(p))).toEqual([]);

  await page.goto("/#/trends");
  await expect(chart(page)).toBeVisible();
  const chunks = requested.filter((p) => /\/assets\/Trends[^/]*\.js$/.test(p));
  expect(chunks).toHaveLength(1);
  // Plot sits in the Trends chunk or, since the workflow builder also draws with it (SPEC-SIM-001), in a shared chunk
  // that only the lazy chunks import; the home page above loaded none of it.
  const trends = await (await page.request.get(chunks[0]!)).text();
  const imported = [...trends.matchAll(/from"\.\/([^"]+\.js)"/g)].map((m) => `/assets/${m[1]}`);
  const texts = [trends, ...(await Promise.all(imported.map(async (p) => (await page.request.get(p)).text())))];
  expect(texts.some((t) => t.includes("plot-d6a7b5"))).toBe(true);
});

test("AC-16: narrow screen, keyboard and empty result", async ({ page }) => {
  const errors = trackErrors(page);
  await page.setViewportSize({ width: 375, height: 800 });
  for (const h of ["#/trends", "#/trends?split=mt"]) {
    await page.goto(`/${h}`);
    await expect(countLine(page)).toHaveText("237 of 237 papers");
    if (h === "#/trends") await expect(chart(page)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  }
  await page.goto("/#/trends");
  await expect(chart(page)).toBeVisible();
  const svgWidth = (await chart(page).boundingBox())!.width;
  const boxWidth = (await page.locator(".trends-chart").boundingBox())!.width;
  expect(svgWidth).toBeLessThanOrEqual(boxWidth);

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/#/trends");
  await expect(chart(page)).toBeVisible();
  await tabUntil(page, () => (document.activeElement as HTMLInputElement | null)?.name === "split");
  await tabUntil(page, () => document.activeElement?.textContent === "Papers");
  await tabUntil(page, () => document.activeElement?.textContent === "Show these in Browse");
  await tabUntil(page, () => document.activeElement?.getAttribute("aria-label") === "2021, fixed_tubing: 9 of 17 papers");
  await tabUntil(page, () => document.activeElement?.getAttribute("aria-label") === "2021: 17 papers");
  await page.goto("/#/trends");
  await expect(chart(page)).toBeVisible();
  await tabUntil(page, () => document.activeElement?.getAttribute("aria-label") === "2021, fixed_tubing: 9 of 17 papers");
  await page.keyboard.press("Enter");
  await expect.poll(() => hash(page)).toBe("#/browse?years=2021-2021&im=fixed_tubing");

  await page.goto("/#/trends?split=field");
  await expect(page.locator("table.count-table")).toBeVisible();
  await tabUntil(page, () => document.activeElement?.getAttribute("aria-label") === "2025, nanomaterials: 16 of 39 papers");

  await page.goto("/#/trends?q=zzzz");
  await expect(countLine(page)).toHaveText("0 of 237 papers");
  await expect(page.getByText("No papers match these filters.", { exact: true })).toBeVisible();
  await expect(page.locator(".trends-chart, .trends-legend, table.count-table")).toHaveCount(0);
  await page.goto("/#/trends?q=zzzz&view=platforms&split=mt");
  await expect(page.getByText("No platforms match these filters.", { exact: true })).toBeVisible();
  await expect(page.locator(".trends-chart, .trends-legend, table.count-table")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("SPEC-TAXO-001 AC-8, AC-14: the unit-operation filter on the dashboard", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/#/trends?uo=sonicate");
  await expect(group(page, "Unit operations").getByRole("checkbox", { name: "sonicate", exact: true })).toBeChecked();
  await expect(countLine(page)).toHaveText("5 of 237 papers");
  await expect(link(page, "Show these in Browse")).toHaveAttribute("href", "#/browse?uo=sonicate");
  await expect(group(page, "Split by").getByRole("radio")).toHaveCount(6);
  expect(errors).toEqual([]);
});
