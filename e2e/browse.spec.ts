// AC-9 to AC-16: the browser and the comparison in Chromium against the e2e build (SPEC-BROWSE-001).
import { expect, test, type Page } from "@playwright/test";

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

const countLine = (page: Page) => page.locator('.browse [aria-live="polite"]');
const hash = (page: Page) => page.evaluate(() => window.location.hash);
const group = (page: Page, name: string) => page.getByRole("group", { name, exact: true });
const box = (page: Page, groupName: string, name: string | RegExp) =>
  group(page, groupName).getByRole("checkbox", { name, exact: typeof name === "string" });
const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const tableSwitch = (page: Page, name: string) => group(page, "Table shown").getByRole("button", { name, exact: true });
const search = (page: Page) => page.getByLabel("Search ids, titles, platform names and instruments");
const selectBox = (page: Page, id: string) => page.getByRole("checkbox", { name: `Select ${id} for comparison`, exact: true });
const rows = (page: Page, table: string) => page.locator(`.browse [data-table="${table}"] tbody tr`);
/** Popover button of a filter group in the filter bar ("Field tag" or "Field tag · 2"; SPEC-UI-001 REQ-025). */
const filterButton = (page: Page, legend: string) =>
  page.locator(".filter-panel").getByRole("button", { name: new RegExp(`^${legend}( · \\d+)?$`) });

/** Opens a filter group's popover if it is closed. */
async function openFilter(page: Page, legend: string) {
  const b = filterButton(page, legend);
  // Groups other than field tag, module types and unit operations fold under "More filters" until they hold a value.
  if ((await b.count()) === 0) await page.locator(".filter-panel").getByRole("button", { name: /^More filters/ }).click();
  if ((await b.getAttribute("aria-expanded")) !== "true") await b.click();
}

/** Checkbox of a filter option, by its code (the name ends "(code)") or by a pattern, with the popover open. */
async function filterBox(page: Page, legend: string, name: string | RegExp) {
  await openFilter(page, legend);
  return group(page, legend).getByRole("checkbox", { name: typeof name === "string" ? new RegExp(`\\(${name}\\)$`) : name });
}

/** Checkbox of a table's column chooser, with its "Columns · N" popover open (SPEC-UI-001 REQ-028). */
async function columnBox(page: Page, chooser: string, name: string) {
  const b = page.getByRole("button", { name: /^Columns · \d+$/ });
  if ((await b.getAttribute("aria-expanded")) !== "true") await b.click();
  return box(page, chooser, name);
}

/** all/any radio of a group's match control, with the popover open. */
async function matchRadio(page: Page, legend: string, value: "all" | "any") {
  await openFilter(page, legend);
  return group(page, `${legend} match`).getByRole("radio", { name: value, exact: true });
}

/** Text of the cell under `header` in the first (or last) body row of a browser table. */
async function cell(page: Page, table: string, header: string, which: "first" | "last" = "first") {
  const headers = await page.locator(`.browse [data-table="${table}"] thead th`).allInnerTexts();
  const i = headers.findIndex((h) => h.trim() === header);
  expect(i, `header ${header}`).toBeGreaterThanOrEqual(0);
  return rows(page, table)[which]().locator("td").nth(i).innerText();
}

async function tabUntil(page: Page, check: () => boolean, max = 200) {
  for (let n = 0; n < max; n++) {
    await page.keyboard.press("Tab");
    if (await page.evaluate(check)) return;
  }
  throw new Error(`Tab did not reach the target within ${max} presses`);
}

test("AC-9: a filtered URL opens the browser", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/#/browse?view=platforms&years=2018-2024&field=catalysis&mt=flow_reactor");
  await expect(tableSwitch(page, "Platforms")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("From", { exact: true })).toHaveValue("2018");
  await expect(page.getByLabel("To", { exact: true })).toHaveValue("2024");
  await expect(await filterBox(page, "Field tag", "catalysis")).toBeChecked();
  await expect(await filterBox(page, "Module types", "flow_reactor")).toBeChecked();
  await expect(await matchRadio(page, "Module types", "all")).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(countLine(page)).toHaveText("6 of 279 platforms");
  await expect(countLine(page)).toHaveAttribute("aria-live", "polite");

  await tableSwitch(page, "Papers").click();
  await expect(countLine(page)).toHaveText("6 of 237 papers");
  expect(await hash(page)).toBe("#/browse?years=2018-2024&field=catalysis&mt=flow_reactor");

  await expect(await filterBox(page, "Software autonomy", /^3\b.*closed-loop iteration over an algorithm-generated search space/)).toBeVisible();

  await page.goto("/#/browse?q=Bedard2018");
  const bedard = rows(page, "papers").filter({ has: page.locator("td:first-child", { hasText: /^Bedard2018$/ }) });
  const platformsCell = bedard.locator("td").last();
  await expect(platformsCell).toHaveText(/^11/);
  const links = platformsCell.getByRole("link");
  await expect(links).toHaveText(Array.from({ length: 11 }, (_, i) => `P${i + 1}`));
  await expect(links.first()).toHaveAttribute("href", "#/platform/Bedard2018/P1");

  const nav = page.getByRole("navigation");
  await expect(nav.getByRole("link", { name: "Home", exact: true })).toHaveAttribute("href", "#/");
  await expect(nav.getByRole("link", { name: "Browse", exact: true })).toHaveAttribute("href", "#/browse?view=platforms");
  await nav.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page.locator(".stat-tiles")).toBeVisible(); // Home (SPEC-UI-001: stat tiles and a 20-row list)
  await expect(page.locator("[data-list=platforms] > li")).toHaveCount(20);
  expect(errors).toEqual([]);
});

test("AC-10: filters write the URL without adding history entries", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation").getByRole("link", { name: "Browse", exact: true }).click();
  // The Browse tab opens the platform table.
  await expect(countLine(page)).toHaveText("279 of 279 platforms");
  const length = await page.evaluate(() => history.length);
  await tableSwitch(page, "Platforms").click();
  await search(page).pressSequentially("chemspeed");
  await expect(countLine(page)).toHaveText("9 of 279 platforms");
  expect(await hash(page)).toBe("#/browse?view=platforms&q=chemspeed");
  expect(await page.evaluate(() => history.length)).toBe(length);

  await page.goBack();
  await expect(page.locator(".stat-tiles")).toBeVisible();
});

test("AC-10: the Browse link resets a filtered browser", async ({ page }) => {
  await page.goto("/#/browse?view=platforms&q=chemspeed");
  await expect(countLine(page)).toHaveText("9 of 279 platforms");
  await page.getByRole("navigation").getByRole("link", { name: "Browse", exact: true }).click();
  await expect(search(page)).toHaveValue("");
  await expect(tableSwitch(page, "Platforms")).toHaveAttribute("aria-pressed", "true");
  await expect(countLine(page)).toHaveText("279 of 279 platforms");
  expect(await hash(page)).toBe("#/browse?view=platforms");
});

test("REQ-003: Back from a platform opened in a filtered browser restores the filters", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation").getByRole("link", { name: "Browse", exact: true }).click();
  await tableSwitch(page, "Papers").click();
  await search(page).pressSequentially("Bedard2018");
  expect(await hash(page)).toBe("#/browse?q=Bedard2018");
  await rows(page, "papers").locator("td").last().getByRole("link", { name: "P2", exact: true }).click();
  await expect(page).toHaveURL(/#\/platform\/Bedard2018\/P2$/);
  await page.goBack();
  expect(await hash(page)).toBe("#/browse?q=Bedard2018");
  await expect(search(page)).toHaveValue("Bedard2018");
  await expect(rows(page, "papers")).toHaveCount(1);
});

test("AC-10: year inputs that cannot apply stay out of the URL", async ({ page }) => {
  await page.goto("/#/browse");
  await page.getByLabel("From", { exact: true }).pressSequentially("2024");
  await page.getByLabel("To", { exact: true }).pressSequentially("2018");
  await expect(page.getByText("From year is after To year")).toBeVisible();
  await expect(countLine(page)).toHaveText("237 of 237 papers");
  expect(await hash(page)).not.toContain("years");

  await page.goto("/#/browse?view=platforms");
  await page.goto("/#/browse");
  await page.getByLabel("From", { exact: true }).pressSequentially("201");
  await expect(countLine(page)).toHaveText("237 of 237 papers");
  expect(await hash(page)).not.toContain("years");
});

test("AC-10: Clear all keeps the table and the selection", async ({ page }) => {
  await page.goto("/#/browse?view=platforms&years=2020-2024&mt=flow_reactor&mtMatch=any&q=Aand2024");
  await selectBox(page, "Aand2024/P1").check();
  await button(page, "Clear all").click();
  await expect(countLine(page)).toHaveText("279 of 279 platforms");
  expect(await hash(page)).toBe("#/browse?view=platforms");
  await expect(page.getByLabel("From", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("To", { exact: true })).toHaveValue("");
  await expect(search(page)).toHaveValue("");
  await expect(page.locator(".filter-pills .pill")).toHaveCount(0);
  await expect(filterButton(page, "Module types")).toHaveText("Module types");
  for (const legend of ["Module types", "Transfer modes"]) {
    await expect(await matchRadio(page, legend, "all")).toBeChecked();
  }
  await expect(page.getByRole("button", { name: /^Compare \(/ })).toHaveText("Compare (1)");
});

test("AC-11: the match control switches between all and any", async ({ page }) => {
  await page.goto("/#/browse?view=platforms&mt=flow_reactor,liquid_handler");
  await expect(countLine(page)).toHaveText("25 of 279 platforms");
  await (await matchRadio(page, "Module types", "any")).check();
  await expect(countLine(page)).toHaveText("209 of 279 platforms");
  expect(await hash(page)).toContain("mtMatch=any");
  await page.keyboard.press("Escape");
  await tableSwitch(page, "Papers").click();
  await expect(countLine(page)).toHaveText("176 of 237 papers");
  await (await matchRadio(page, "Module types", "all")).check();
  await expect(countLine(page)).toHaveText("19 of 237 papers");
  expect(await hash(page)).not.toContain("mtMatch");
});

test("AC-12: sorting and the column chooser by keyboard", async ({ page }) => {
  await page.goto("/#/browse");
  await expect(rows(page, "papers")).toHaveCount(237);
  await tabUntil(page, () => {
    const el = document.activeElement;
    return !!el && el.matches("th button") && el.textContent === "Year";
  });
  const yearHeader = page.locator('.browse [data-table="papers"] thead th', { hasText: /^Year$/ });
  await page.keyboard.press("Enter");
  await expect(yearHeader).toHaveAttribute("aria-sort", "ascending");
  expect(await cell(page, "papers", "Paper")).toBe("King1974");
  await page.keyboard.press("Enter");
  await expect(yearHeader).toHaveAttribute("aria-sort", "descending");
  expect(await cell(page, "papers", "Paper")).toBe("Adesiji2026a");
  await page.keyboard.press("Enter");
  await expect(yearHeader).toHaveAttribute("aria-sort", "none");
  expect(await cell(page, "papers", "Paper")).toBe("Aand2024");

  await (await columnBox(page, "Paper table columns", "Venue")).press("Space");
  await expect(page.locator('.browse [data-table="papers"] thead th', { hasText: /^Venue$/ })).toHaveCount(0);
  await expect(await columnBox(page, "Paper table columns", "Paper")).toBeChecked();
  await expect(await columnBox(page, "Paper table columns", "Paper")).toBeDisabled();
  await page.keyboard.press("Escape");

  await page.goto("/#/browse?view=platforms");
  await expect(rows(page, "platforms")).toHaveCount(279);
  await button(page, "Steps").focus();
  await page.keyboard.press("Enter");
  expect(await cell(page, "platforms", "Steps")).toBe("4");
  await page.keyboard.press("Enter");
  expect(await cell(page, "platforms", "Platform")).toBe("HamediRad2019/P1");
  await button(page, "Name").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('.browse [data-table="platforms"] thead th', { hasText: /^Name$/ })).toHaveAttribute("aria-sort", "ascending");
  expect(await cell(page, "platforms", "Name", "last")).toBe("—");
  await page.keyboard.press("Enter");
  await expect(page.locator('.browse [data-table="platforms"] thead th', { hasText: /^Name$/ })).toHaveAttribute("aria-sort", "descending");
  expect(await cell(page, "platforms", "Name", "last")).toBe("—");
  for (const name of ["Platform", "Select"]) {
    await expect(await columnBox(page, "Platform table columns", name)).toBeChecked();
    await expect(await columnBox(page, "Platform table columns", name)).toBeDisabled();
  }
});

test("AC-13: selecting platforms for comparison", async ({ page }) => {
  await page.goto("/#/browse?view=platforms&q=Aand2024");
  await selectBox(page, "Aand2024/P1").focus();
  await page.keyboard.press("Space");
  const compare = page.getByRole("button", { name: /^Compare \(/ });
  await expect(compare).toHaveText("Compare (1)");
  await expect(compare).toBeDisabled();
  const buttonBox = await compare.boundingBox();
  const tableBox = await page.locator('.browse [data-table="platforms"]').boundingBox();
  expect(buttonBox!.y).toBeLessThan(tableBox!.y);

  await search(page).fill("Li2020");
  await selectBox(page, "Li2020/P1").focus();
  await page.keyboard.press("Space");
  await expect(compare).toHaveText("Compare (2)");
  await expect(compare).toBeEnabled();
  await page.keyboard.press("Space");
  await expect(compare).toHaveText("Compare (1)");
  await expect(compare).toBeDisabled();
  await page.keyboard.press("Space");
  await expect(compare).toHaveText("Compare (2)");
  await expect(compare).toBeEnabled();

  await search(page).fill("Angello2022");
  await selectBox(page, "Angello2022/P1").focus();
  await page.keyboard.press("Space");
  await expect(compare).toHaveText("Compare (3)");
  await expect(compare).toBeEnabled();
  await search(page).fill("");
  await expect(rows(page, "platforms")).toHaveCount(279);
  const table = page.locator('.browse [data-table="platforms"]');
  await expect(table.locator('input[type="checkbox"]:checked')).toHaveCount(3);
  await expect(table.locator('input[type="checkbox"]:not(:checked):disabled')).toHaveCount(276);

  const before = await hash(page);
  await compare.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/compare\/Aand2024\/P1,Li2020\/P1,Angello2022\/P1$/);
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Browse", exact: true })).toBeVisible();
  expect(await hash(page)).toBe(before);
});

const cellsOf = (page: Page, table: string, key: string) =>
  page.locator(`[data-table="${table}"] tbody tr`).filter({ has: page.locator(`th [data-code="${key}"]`) }).locator("td");
const stepOrders = (page: Page, id: string) =>
  page.locator(`[data-steps="${id}"] tbody tr`).evaluateAll((els) => els.map((e) => e.getAttribute("data-step-order")));

test("AC-14: the comparison page", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/#/compare/Aand2024/P1,Li2020/P1");
  await expect(page.locator('[data-table="compare-platforms"] thead th')).toHaveText([
    "auto-optimization platform (AOP)",
    "Intelligent cloud lab (MAOSIC)",
  ]);
  const links = page.locator('[data-table="compare-platforms"] a');
  await expect(links).toHaveText(["Aand2024/P1", "Li2020/P1"]);
  await expect(links.nth(0)).toHaveAttribute("href", "#/platform/Aand2024/P1");
  await expect(links.nth(1)).toHaveAttribute("href", "#/platform/Li2020/P1");
  await expect(page.locator('[data-table="compare-modules"] tbody tr')).toHaveCount(6);
  await expect(cellsOf(page, "compare-modules", "instrument_optical")).toHaveText(["1", "2"]);
  await expect(cellsOf(page, "compare-modules", "liquid_handler")).toHaveText(["—", "1"]);
  await expect(page.locator('[data-table="compare-transfers"] tbody tr')).toHaveCount(2);
  await expect(cellsOf(page, "compare-transfers", "fixed_tubing")).toHaveText(["3", "3"]);
  await expect(cellsOf(page, "compare-transfers", "robot_arm_gantry")).toHaveText(["—", "1"]);
  expect(await stepOrders(page, "Aand2024/P1")).toEqual(["1", "2", "3", "4", "5", "6"]);
  expect(await stepOrders(page, "Li2020/P1")).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9"]);

  await page.goto("/#/compare/Aand2024/P1,Li2020/P1,Angello2022/P1");
  await expect(page.locator('[data-table="compare-platforms"] thead th')).toHaveCount(3);
  await expect(page.locator('[data-table="compare-modules"] tbody tr')).toHaveCount(8);
  await expect(page.locator('[data-table="compare-transfers"] tbody tr')).toHaveCount(3);
  expect(errors).toEqual([]);
});

async function expectCompareError(page: Page, texts: string[]) {
  const alert = page.getByRole("alert");
  for (const t of texts) await expect(alert).toContainText(t);
  await expect(alert.getByRole("link", { name: "Browse", exact: true })).toHaveAttribute("href", "#/browse?view=platforms");
  await expect(alert.getByRole("link", { name: "Home", exact: true })).toHaveAttribute("href", "#/");
}

test("AC-15: comparison errors by id", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/#/compare/Aand2024/P1");
  await expectCompareError(page, ["1 platform id given", "2 or 3"]);
  await page.goto("/#/compare/Aand2024/P1,Li2020/P1,Angello2022/P1,Bedard2018/P1");
  await expectCompareError(page, ["4 platform ids given", "2 or 3"]);
  await page.goto("/#/compare/Aand2024/P1,Aand2024/P1");
  await expectCompareError(page, ["Listed twice: Aand2024/P1"]);
  await page.goto("/#/compare/Aand2024/P1,Nope2000/P1");
  await expectCompareError(page, ["Unknown platform ids: Nope2000/P1"]);
  expect(errors).toEqual([]);
});

test.describe("AC-15: comparison errors when a paper file fails", () => {
  const FILE = "data/platforms/Li2020.json";
  const cases: [string, Parameters<Page["route"]>[1], string[]][] = [
    ["HTTP 500", (route) => route.fulfill({ status: 500, body: "server error" }), [FILE]],
    ["a body that is not JSON", (route) => route.fulfill({ status: 200, body: "not json" }), [FILE]],
    [
      "a file without the platform",
      (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"paper_id":"Li2020","platforms":[]}' }),
      ["Li2020/P1", FILE],
    ],
    ["an aborted request", (route) => route.abort(), [FILE]],
  ];
  for (const [name, handler, texts] of cases) {
    test(name, async ({ page }) => {
      const errors = trackErrors(page);
      await page.route(`**/${FILE}`, handler);
      await page.goto("/#/compare/Aand2024/P1,Li2020/P1");
      await expectCompareError(page, texts);
      expect(errors).toEqual([]);
    });
  }
});

test("AC-16: no page-level horizontal scroll at 375 px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  const pages: [string, string][] = [
    ["/#/browse", '.browse [data-table="papers"] tbody tr'],
    ["/#/browse?view=platforms", '.browse [data-table="platforms"] tbody tr'],
    ["/#/compare/Aand2024/P1,Li2020/P1,Angello2022/P1", '[data-table="compare-modules"] tbody tr'],
  ];
  for (const [url, ready] of pages) {
    await page.goto(url);
    await expect(page.locator(ready).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth), url).toBeLessThanOrEqual(375);
  }
});

test("Follow-up (SPEC-UI-001 REQ-025): at desktop width the filter bar sits above results visible without scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/#/browse?view=platforms&field=catalysis");
  await expect(rows(page, "platforms").first()).toBeVisible();
  await expect(filterButton(page, "Field tag")).toHaveText("Field tag · 1");
  await expect(button(page, "Remove Field tag: Catalysis")).toBeVisible();
  for (const target of [countLine(page), rows(page, "platforms").first()]) {
    const b = (await target.boundingBox())!;
    expect(b.y + b.height).toBeLessThanOrEqual(720);
  }
  // A popover opens over the results and closes again without changing the result or the URL.
  await openFilter(page, "Field tag");
  await expect(group(page, "Field tag")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(group(page, "Field tag")).toBeHidden();
  await expect(countLine(page)).toHaveText("23 of 279 platforms");
  expect(await hash(page)).toBe("#/browse?view=platforms&field=catalysis");
});

test("Follow-up (SPEC-UI-001 REQ-025): at phone width the filters fold into a tray and the count stays on the first screen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/#/browse?field=catalysis&im=mixed");
  const tray = page.locator(".filter-panel").getByRole("button", { name: /^Filters/ });
  await expect(tray).toContainText("2");
  await expect(group(page, "Field tag")).toHaveCount(0);
  const b = (await countLine(page).boundingBox())!;
  expect(b.y + b.height).toBeLessThanOrEqual(800);
  await tray.click();
  const sheet = page.getByRole("dialog", { name: "Filters" });
  await sheet.getByRole("button", { name: /^Field tag · 1/ }).click();
  await expect(group(page, "Field tag")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test("Follow-up: Compare shows the comparison page at once, before the hashchange event arrives", async ({ page }) => {
  await page.goto("/#/browse?view=platforms");
  await selectBox(page, "Aand2024/P1").check();
  await selectBox(page, "Li2020/P1").check();
  // hashchange is a queued task, so after the click plus a few microtasks it has not fired yet.
  const seen = await page.evaluate(async () => {
    let fired = false;
    window.addEventListener("hashchange", () => (fired = true), { once: true });
    const compare = [...document.querySelectorAll("button")].find((b) => b.textContent?.startsWith("Compare ("))!;
    compare.click();
    for (let i = 0; i < 5; i++) await new Promise<void>((r) => queueMicrotask(r));
    return { fired, h1: document.querySelector("main h1")?.textContent ?? "", hash: window.location.hash };
  });
  expect(seen).toEqual({ fired: false, h1: "Compare platforms", hash: "#/compare/Aand2024/P1,Li2020/P1" });
  await expect(page.locator('[data-table="compare-modules"] tbody tr')).toHaveCount(6);
});

test("SPEC-TAXO-001 AC-14: the unit-operation filter", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/#/browse?view=platforms");
  // The group follows Module types and Techniques (SPEC-TECH-001 REQ-008) in the bar, all shown before "More filters",
  // and its popover holds the options then the match control.
  const buttons = await page.locator(".filter-panel .filter-button").allTextContents();
  expect(buttons.indexOf("Techniques")).toBe(buttons.indexOf("Module types") + 1);
  expect(buttons.indexOf("Unit operations")).toBe(buttons.indexOf("Techniques") + 1);
  await openFilter(page, "Unit operations");
  await expect(group(page, "Unit operations").getByRole("checkbox")).toHaveCount(31);
  expect(await page.locator(".filter-popover-panel legend").allTextContents()).toEqual(["Unit operations", "Unit operations match"]);
  await expect(await matchRadio(page, "Unit operations", "all")).toBeChecked();
  await (await filterBox(page, "Unit operations", "sonicate")).check();
  await expect(countLine(page)).toHaveText("5 of 279 platforms");
  expect(await hash(page)).toBe("#/browse?view=platforms&uo=sonicate");
  await (await filterBox(page, "Unit operations", "mix")).check();
  await expect(countLine(page)).toHaveText("0 of 279 platforms");
  await (await matchRadio(page, "Unit operations", "any")).check();
  await expect(countLine(page)).toHaveText("111 of 279 platforms");
  expect(await hash(page)).toBe("#/browse?view=platforms&uo=mix,sonicate&uoMatch=any");
  await expect(filterButton(page, "Unit operations")).toHaveText("Unit operations · 2");
  await button(page, "Clear all").click();
  await expect(countLine(page)).toHaveText("279 of 279 platforms");
  expect(await hash(page)).toBe("#/browse?view=platforms");
  expect(errors).toEqual([]);
});

// SPEC-RELEASE-001 REQ-009, REQ-010: autonomy headers written out; one note defines integration mode and the levels.
test("plain language: autonomy headers and the note under the paper table", async ({ page }) => {
  await page.goto("/#/browse");
  const headers = page.locator('[data-table="papers"] thead th');
  await expect(headers.filter({ hasText: /^Software autonomy$/ })).toHaveCount(1);
  await expect(headers.filter({ hasText: /^Hardware autonomy$/ })).toHaveCount(1);
  await expect(headers.filter({ hasText: /autonomy/ })).toHaveCount(2);
  const note = page.locator(".browse .table-note");
  await expect(note).toHaveCount(1);
  for (const phrase of [
    "Integration mode is how material moves between the modules of a paper's platforms",
    "mixed when several are used",
    "none when no material connection is coded",
    "Tom et al. (2024)",
    "one experiment from a data-driven design",
    "closed-loop iteration in which results choose the next experiment",
    "closed-loop iteration over an algorithm-generated search space",
    "a device doing one kind of task",
    "a workflow joining several tasks",
    "a fully automated laboratory running varied experiments without human intervention",
  ]) {
    await expect(note, phrase).toContainText(phrase);
  }
});
