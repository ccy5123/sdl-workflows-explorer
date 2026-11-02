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
const search = (page: Page) => page.getByLabel("Search ids, titles and platform names");
const selectBox = (page: Page, id: string) => page.getByRole("checkbox", { name: `Select ${id} for comparison`, exact: true });
const rows = (page: Page, table: string) => page.locator(`.browse [data-table="${table}"] tbody tr`);

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
  await expect(box(page, "Field tag", "catalysis")).toBeChecked();
  await expect(box(page, "Module types", "flow_reactor")).toBeChecked();
  await expect(group(page, "Module types match").getByRole("radio", { name: "all", exact: true })).toBeChecked();
  await expect(countLine(page)).toHaveText("6 of 280 platforms");
  await expect(countLine(page)).toHaveAttribute("aria-live", "polite");

  await tableSwitch(page, "Papers").click();
  await expect(countLine(page)).toHaveText("6 of 238 papers");
  expect(await hash(page)).toBe("#/browse?years=2018-2024&field=catalysis&mt=flow_reactor");

  await expect(box(page, "Software autonomy", /^3\b.*closed-loop iteration over an algorithm-generated search space/)).toBeVisible();

  await page.goto("/#/browse?q=Bedard2018");
  const bedard = rows(page, "papers").filter({ has: page.locator("td:first-child", { hasText: /^Bedard2018$/ }) });
  const platformsCell = bedard.locator("td").last();
  await expect(platformsCell).toHaveText(/^11/);
  const links = platformsCell.getByRole("link");
  await expect(links).toHaveText(Array.from({ length: 11 }, (_, i) => `P${i + 1}`));
  await expect(links.first()).toHaveAttribute("href", "#/platform/Bedard2018/P1");

  const nav = page.getByRole("navigation");
  await expect(nav.getByRole("link", { name: "Home", exact: true })).toHaveAttribute("href", "#/");
  await expect(nav.getByRole("link", { name: "Browse", exact: true })).toHaveAttribute("href", "#/browse");
  await nav.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page.locator("table.counts")).toBeVisible();
  await expect(page.locator('[data-table="platforms"] tbody tr')).toHaveCount(280);
  expect(errors).toEqual([]);
});

test("AC-10: filters write the URL without adding history entries", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation").getByRole("link", { name: "Browse", exact: true }).click();
  await expect(countLine(page)).toHaveText("238 of 238 papers");
  const length = await page.evaluate(() => history.length);
  await tableSwitch(page, "Platforms").click();
  await search(page).pressSequentially("chemspeed");
  await expect(countLine(page)).toHaveText("3 of 280 platforms");
  expect(await hash(page)).toBe("#/browse?view=platforms&q=chemspeed");
  expect(await page.evaluate(() => history.length)).toBe(length);

  await page.goBack();
  await expect(page.locator("table.counts")).toBeVisible();
});

test("AC-10: the Browse link resets a filtered browser", async ({ page }) => {
  await page.goto("/#/browse?view=platforms&q=chemspeed");
  await expect(countLine(page)).toHaveText("3 of 280 platforms");
  await page.getByRole("navigation").getByRole("link", { name: "Browse", exact: true }).click();
  await expect(search(page)).toHaveValue("");
  await expect(tableSwitch(page, "Papers")).toHaveAttribute("aria-pressed", "true");
  await expect(countLine(page)).toHaveText("238 of 238 papers");
  expect(await hash(page)).toBe("#/browse");
});

test("REQ-003: Back from a platform opened in a filtered browser restores the filters", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation").getByRole("link", { name: "Browse", exact: true }).click();
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
  await expect(countLine(page)).toHaveText("238 of 238 papers");
  expect(await hash(page)).not.toContain("years");

  await page.goto("/#/browse?view=platforms");
  await page.goto("/#/browse");
  await page.getByLabel("From", { exact: true }).pressSequentially("201");
  await expect(countLine(page)).toHaveText("238 of 238 papers");
  expect(await hash(page)).not.toContain("years");
});

test("AC-10: Clear filters keeps the table and the selection", async ({ page }) => {
  await page.goto("/#/browse?view=platforms&years=2020-2024&mt=flow_reactor&mtMatch=any&q=Aand2024");
  await selectBox(page, "Aand2024/P1").check();
  await button(page, "Clear filters").click();
  await expect(countLine(page)).toHaveText("280 of 280 platforms");
  expect(await hash(page)).toBe("#/browse?view=platforms");
  await expect(page.getByLabel("From", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("To", { exact: true })).toHaveValue("");
  await expect(search(page)).toHaveValue("");
  await expect(page.locator('.filter-panel input[type="checkbox"]:checked')).toHaveCount(0);
  for (const name of ["Module types match", "Transfer modes match"]) {
    await expect(group(page, name).getByRole("radio", { name: "all", exact: true })).toBeChecked();
  }
  await expect(page.getByRole("button", { name: /^Compare \(/ })).toHaveText("Compare (1)");
});

test("AC-11: the match control switches between all and any", async ({ page }) => {
  await page.goto("/#/browse?view=platforms&mt=flow_reactor,liquid_handler");
  await expect(countLine(page)).toHaveText("25 of 280 platforms");
  await group(page, "Module types match").getByRole("radio", { name: "any", exact: true }).check();
  await expect(countLine(page)).toHaveText("209 of 280 platforms");
  expect(await hash(page)).toContain("mtMatch=any");
  await tableSwitch(page, "Papers").click();
  await expect(countLine(page)).toHaveText("176 of 238 papers");
  await group(page, "Module types match").getByRole("radio", { name: "all", exact: true }).check();
  await expect(countLine(page)).toHaveText("19 of 238 papers");
  expect(await hash(page)).not.toContain("mtMatch");
});

test("AC-12: sorting and the column chooser by keyboard", async ({ page }) => {
  await page.goto("/#/browse");
  await expect(rows(page, "papers")).toHaveCount(238);
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

  await box(page, "Paper table columns", "Venue").press("Space");
  await expect(page.locator('.browse [data-table="papers"] thead th', { hasText: /^Venue$/ })).toHaveCount(0);
  await expect(box(page, "Paper table columns", "Paper")).toBeChecked();
  await expect(box(page, "Paper table columns", "Paper")).toBeDisabled();

  await page.goto("/#/browse?view=platforms");
  await expect(rows(page, "platforms")).toHaveCount(280);
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
    await expect(box(page, "Platform table columns", name)).toBeChecked();
    await expect(box(page, "Platform table columns", name)).toBeDisabled();
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
  await expect(rows(page, "platforms")).toHaveCount(280);
  const table = page.locator('.browse [data-table="platforms"]');
  await expect(table.locator('input[type="checkbox"]:checked')).toHaveCount(3);
  await expect(table.locator('input[type="checkbox"]:not(:checked):disabled')).toHaveCount(277);

  const before = await hash(page);
  await compare.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/compare\/Aand2024\/P1,Li2020\/P1,Angello2022\/P1$/);
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Browse", exact: true })).toBeVisible();
  expect(await hash(page)).toBe(before);
});

const cellsOf = (page: Page, table: string, key: string) =>
  page.locator(`[data-table="${table}"] tbody tr`).filter({ has: page.locator("th", { hasText: new RegExp(`^${key}$`) }) }).locator("td");
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
  await expect(alert.getByRole("link", { name: "Browse", exact: true })).toHaveAttribute("href", "#/browse");
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

test("Follow-up: at desktop width the filters sit beside the results, which are visible without scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/#/browse?view=platforms&field=catalysis");
  await expect(rows(page, "platforms").first()).toBeVisible();
  const toggle = page.getByRole("button", { name: /^Filters/ });
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(toggle).toContainText("1 active");
  for (const target of [countLine(page), rows(page, "platforms").first()]) {
    const b = (await target.boundingBox())!;
    expect(b.y + b.height).toBeLessThanOrEqual(720);
  }
  await expect(group(page, "Field tag")).toBeVisible();
  // Collapsing hides the controls but keeps the filtered result and the URL.
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(group(page, "Field tag")).toBeHidden();
  await expect(countLine(page)).toHaveText("23 of 280 platforms");
  expect(await hash(page)).toBe("#/browse?view=platforms&field=catalysis");
  await toggle.press("Enter");
  await expect(group(page, "Field tag")).toBeVisible();
});

test("Follow-up: at phone width the filters start collapsed and open with the toggle", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/#/browse?field=catalysis&im=mixed");
  const toggle = page.getByRole("button", { name: /^Filters/ });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toContainText("2 active");
  await expect(group(page, "Field tag")).toBeHidden();
  const b = (await countLine(page).boundingBox())!;
  expect(b.y + b.height).toBeLessThanOrEqual(800);
  await toggle.click();
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
  await expect(group(page, "Unit operations").getByRole("checkbox")).toHaveCount(31);
  const names = await page.locator(".filter-panel legend").allTextContents();
  expect(names.indexOf("Unit operations")).toBe(names.indexOf("Transfer modes match") + 1);
  expect(names.indexOf("Unit operations match")).toBe(names.indexOf("Unit operations") + 1);
  await expect(group(page, "Unit operations match").getByRole("radio", { name: "all", exact: true })).toBeChecked();
  await box(page, "Unit operations", "sonicate").check();
  await expect(countLine(page)).toHaveText("5 of 280 platforms");
  expect(await hash(page)).toBe("#/browse?view=platforms&uo=sonicate");
  await box(page, "Unit operations", "mix").check();
  await expect(countLine(page)).toHaveText("0 of 280 platforms");
  await group(page, "Unit operations match").getByRole("radio", { name: "any", exact: true }).check();
  await expect(countLine(page)).toHaveText("111 of 280 platforms");
  expect(await hash(page)).toBe("#/browse?view=platforms&uo=mix,sonicate&uoMatch=any");
  await expect(page.getByRole("button", { name: /^Filters/ })).toHaveText("Filters (1 active)");
  await button(page, "Clear filters").click();
  await expect(countLine(page)).toHaveText("280 of 280 platforms");
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
