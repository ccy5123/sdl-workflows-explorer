// SPEC-BENCH-001 AC-10 to AC-15: the benchmark page and the item explorer in Chromium against the e2e build.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { PINNED_DOI, PINNED_RELEASE_DIR, PINNED_VERSION, pinnedExclusionReason } from "../tests/pinned-release";

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

const MT = "chrono2023-module_type";
const TM = "chrono2023-transfer_mode";
const REFERENCE_TEXT = readFileSync(
  join(PINNED_RELEASE_DIR, "modes", "benchmark", "reference_results.json"),
  "utf8",
);
const CAPTION =
  "Benchmark chrono2023 has 2 tasks over 238 papers. The data dictionary describes the split as: “Benchmark: chrono2023 " +
  "trains on papers first public in 2023 or earlier and tests on papers first public in 2024 or later.” The labels are " +
  "the release's model codings, so top-1 accuracy measures agreement with those codings.";
const MT_RULE = "every step that has a primary module (its first listed module); the label is that module's type";
const MT_INPUTS =
  "the paper's first field tag; the step's unit operation and those of the previous and next steps of the same platform " +
  "in step order (START and END at the ends)";
const TM_RULE =
  "every material connection that attaches to a pair of steps of its platform: the first consecutive step pair whose " +
  "first modules are the connection's source and target modules; otherwise the last step on the source module before " +
  "the first step on the target module, and that step; connections that attach to no pair are not items";
const TM_INPUTS = "the paper's first field tag; the unit operations and families of the two attached steps";

const hash = (page: Page) => page.evaluate(() => window.location.hash);
const h1 = (page: Page, name: string) => page.getByRole("heading", { level: 1, name, exact: true });
const region = (page: Page, name: string) => page.getByRole("region", { name, exact: true });
const countLine = (page: Page) => page.locator('.benchmark [aria-live="polite"]');
const cellTexts = (page: Page, selector: string) =>
  page.locator(selector).evaluateAll((rows) => rows.map((r) => [...r.querySelectorAll("td")].map((td) => td.textContent ?? "")));
const labelRow = (page: Page, task: string, label: string) =>
  region(page, task).locator("tbody tr", { has: page.getByRole("link", { name: label, exact: true }) });
const platformRow = (page: Page, id: string) =>
  region(page, "Items by platform").locator("tbody tr", { has: page.getByRole("link", { name: id, exact: true }) });
const explorerRow = (page: Page, item: string) =>
  page.locator(".benchmark table tbody tr", { has: page.locator('td[data-label="Item"]', { hasText: new RegExp(`^${item}$`) }) });

test("AC-10: the benchmark page in order, with the split table, tasks, reference results, evaluation and platforms", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/#/benchmark");
  await expect(h1(page, "Benchmark chrono2023")).toBeVisible();
  const order = await page.locator("main").evaluate((m) =>
    [...m.querySelectorAll("h1, h2, p.caption, table[aria-label]")]
      .filter((el) => !(el.tagName === "P" && el.closest("section")))
      .map((el) => (el.tagName === "TABLE" ? `table:${el.getAttribute("aria-label")}` : `${el.tagName.toLowerCase()}:${el.textContent}`)),
  );
  expect(order).toEqual([
    "h1:Benchmark chrono2023",
    `p:${CAPTION}`,
    "table:Split",
    `h2:${MT}`,
    `h2:${TM}`,
    "h2:Reference results",
    "h2:Run the evaluation yourself",
    "h2:Items by platform",
  ]);
  await expect(page.getByText(CAPTION, { exact: true })).toBeVisible();

  expect(await cellTexts(page, 'table[aria-label="Split"] tbody tr')).toEqual([
    ["train", "135", "1384", "542"],
    ["test", "99", "1199", "426"],
    ["excluded", "4", "38", "15"],
    ["Total", "238", "2621", "983"],
  ]);
  await expect(page.getByText(`Excluded: 4 papers, ${pinnedExclusionReason()}.`, { exact: true })).toBeVisible();

  for (const [task, title, unit, rule, inputs, labels, sentence] of [
    [MT, "Primary module type of a step", "step", MT_RULE, MT_INPUTS, 22,
      "22 labels occur among the items of this task. Items marked uncertain in the release: 171 train, 163 test, 6 excluded."],
    [TM, "Transfer mode of a material connection", "material connection", TM_RULE, TM_INPUTS, 5,
      "5 labels occur among the items of this task. Items marked uncertain in the release: 47 train, 51 test, 1 excluded."],
  ] as const) {
    const section = region(page, task);
    await expect(section.locator("p.caption")).toHaveText(title);
    await expect(section.locator("dt")).toHaveText(["Unit of an item", "Which items", "Inputs"]);
    await expect(section.locator("dd")).toHaveText([unit, rule, inputs]);
    await expect(section.locator("tbody tr")).toHaveCount(labels);
    await expect(section.getByText(sentence, { exact: true })).toBeVisible();
  }

  const reference = region(page, "Reference results");
  expect(await cellTexts(page, 'section[aria-labelledby="bench-reference-results"] table:first-of-type tbody tr')).toEqual([
    [MT, "1199 (99)", "0.6681", "0.6881", "+0.0200", "[-0.0097, +0.0529]", "2000"],
    [TM, "426 (93)", "0.4413", "0.5117", "+0.0704", "[+0.0172, +0.1255]", "2000"],
  ]);
  await expect(
    reference.getByText(
      "Difference (computed) is reference model top-1 minus baseline top-1, computed by this site from the two recorded values; reference_results.json does not record it.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(reference.getByText("Test papers are the test papers with at least one item of the task.", { exact: true })).toBeVisible();
  const details = reference.locator("details");
  await expect(details.locator("summary")).toHaveText("reference_results.json as published");
  expect(await details.evaluate((d) => (d as HTMLDetailsElement).open)).toBe(false);
  expect(await details.locator("pre").textContent()).toBe(REFERENCE_TEXT);

  await expect(region(page, "Run the evaluation yourself").getByRole("link", { name: `https://doi.org/${PINNED_DOI}` })).toHaveAttribute(
    "href",
    `https://doi.org/${PINNED_DOI}`,
  );

  const platforms = region(page, "Items by platform");
  await expect(countLine(page)).toHaveText("280 platforms");
  await expect(platforms.locator("tbody tr")).toHaveCount(280);
  await expect(platformRow(page, "Aand2024/P1").locator('td[data-label="Name"]')).toHaveText("auto-optimization platform (AOP)");
  await platforms.getByLabel("Split").selectOption({ label: "Test" });
  await expect(countLine(page)).toHaveText("116 of 280 platforms");
  await expect(platforms.locator("tbody tr")).toHaveCount(116);
  expect(await hash(page)).toBe("#/benchmark");
  expect(errors).toEqual([]);
});

test("AC-11: label, platform and count links", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/#/benchmark");
  await expect(h1(page, "Benchmark chrono2023")).toBeVisible();
  await region(page, TM).getByRole("link", { name: "mobile_robot", exact: true }).click();
  expect(await hash(page)).toBe("#/taxonomy/transfer_mode/mobile_robot");
  await expect(h1(page, "mobile_robot")).toBeVisible();
  await page.goBack();

  await platformRow(page, "Aand2024/P1").getByRole("link", { name: "Aand2024/P1", exact: true }).click();
  expect(await hash(page)).toBe("#/platform/Aand2024/P1");
  await page.goBack();

  await labelRow(page, TM, "mobile_robot").locator('td[data-label="Test"] a').click();
  await expect(page.locator(".benchmark h1")).toHaveText("Benchmark items");
  await expect(countLine(page)).toHaveText("29 of 983 items");
  await page.goBack();

  await platformRow(page, "Aand2024/P1").locator(`td[data-label="${MT} items"] a`).click();
  await expect(countLine(page)).toHaveText("6 of 2621 items");
  await page.goBack();

  await page.locator('table[aria-label="Split"] tbody tr', { has: page.locator("td", { hasText: /^excluded$/ }) })
    .locator(`td[data-label="${MT} items"] a`)
    .click();
  await expect(countLine(page)).toHaveText("38 of 2621 items");
  expect(errors).toEqual([]);
});

test("AC-12: the explorer, its controls, Show 100 more and the platform filter", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/#/");
  await expect(page.getByText(`Data version ${PINNED_VERSION}`)).toBeVisible();
  const length = await page.evaluate(() => history.length);
  await page.evaluate(() => {
    window.location.hash = "#/benchmark/items";
  });
  await expect(countLine(page)).toHaveText("2621 of 2621 items");
  expect(await hash(page)).toBe(`#/benchmark/items?task=${MT}`);
  expect(await page.evaluate(() => history.length)).toBe(length + 1);
  await expect(h1(page, "Benchmark items")).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to the benchmark", exact: true })).toHaveAttribute("href", "#/benchmark");

  const rows = page.locator(".benchmark table tbody tr");
  await expect(rows).toHaveCount(100);
  const first = rows.first();
  await expect(first.locator('td[data-label="Item"]')).toHaveText("Aand2024/P1/S1");
  await expect(first.locator('td[data-label="Platform"] a')).toHaveAttribute("href", "#/platform/Aand2024/P1");
  await expect(first.locator('td[data-label="Label"] a')).toHaveAttribute("href", "#/taxonomy/module_type/fluidics");
  await expect(first.locator('td[data-label="Previous"]')).toHaveText("START");
  await expect(first.locator('td[data-label="Previous"] a')).toHaveCount(0);
  await expect(first.locator('td[data-label="Field tag"] a')).toHaveAttribute("href", "#/taxonomy/field_tag/chemistry_synthesis");
  await expect(first.locator('td[data-label="Unit operation"] a')).toHaveAttribute("href", "#/taxonomy/unit_operation/dispense_liquid");
  await expect(first.locator('td[data-label="Next"] a')).toHaveAttribute("href", "#/taxonomy/unit_operation/react_photo_electro");
  await expect(first.locator('td[data-label="Uncertain"]')).toHaveText("");
  await expect(explorerRow(page, "Aand2024/P1/S4").locator('td[data-label="Uncertain"]')).toHaveText("yes");
  await page.getByRole("button", { name: "Show 100 more", exact: true }).click();
  await expect(rows).toHaveCount(200);

  await page.getByLabel("Split").selectOption({ label: "Test" });
  await expect(countLine(page)).toHaveText("1199 of 2621 items");
  await expect(rows).toHaveCount(100);
  expect(await hash(page)).toBe(`#/benchmark/items?task=${MT}&split=test`);
  await page.getByLabel("Label").selectOption("software");
  await expect(countLine(page)).toHaveText("281 of 2621 items");

  await page.getByLabel("Task").selectOption(TM);
  await expect(page.getByLabel("Label")).toHaveValue("");
  expect(await hash(page)).toBe(`#/benchmark/items?task=${TM}&split=test`);
  await expect(page.locator(".benchmark table thead th")).toHaveText([
    "Item", "Platform", "Split", "Label", "Field tag", "From", "To", "From family", "To family", "Uncertain",
  ]);
  await expect(rows.first().locator('td[data-label="From family"] a')).toHaveCount(0);
  await expect(rows.first().locator('td[data-label="To family"] a')).toHaveCount(0);
  await expect(rows.first().locator('td[data-label="From family"]')).not.toHaveText("");

  await page.getByLabel("Split").selectOption({ label: "Excluded" });
  await page.getByLabel("Label").selectOption("unmapped");
  await expect(countLine(page)).toHaveText("0 of 983 items");
  await expect(page.getByText("No items match.", { exact: true })).toBeVisible();
  await expect(page.locator(".benchmark table")).toHaveCount(0);

  await page.goto(`/#/benchmark/items?task=${MT}&platform=Aand2024%2FP1`);
  await expect(countLine(page)).toHaveText("6 of 2621 items");
  await expect(page.getByText("Platform: Aand2024/P1")).toBeVisible();
  await page.getByRole("button", { name: "Remove platform", exact: true }).click();
  await expect(countLine(page)).toHaveText("2621 of 2621 items");
  expect(await hash(page)).toBe(`#/benchmark/items?task=${MT}`);
  await expect(page.getByText("Platform: Aand2024/P1")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("AC-12: back navigation returns to the page that opened the explorer", async ({ page }) => {
  await page.goto("/#/");
  await expect(page.getByText(`Data version ${PINNED_VERSION}`)).toBeVisible();
  await page.evaluate(() => {
    window.location.hash = "#/benchmark/items";
  });
  await expect(countLine(page)).toHaveText("2621 of 2621 items");
  await page.goBack();
  expect(await hash(page)).toBe("#/");
  await expect(page.getByText(`Data version ${PINNED_VERSION}`)).toBeVisible();
});

test("AC-13: requests of each route", async ({ page }) => {
  const errors = trackErrors(page);
  const requested: string[] = [];
  page.on("request", (r) => requested.push(new URL(r.url()).pathname));
  await page.goto("/#/benchmark");
  await expect(h1(page, "Benchmark chrono2023")).toBeVisible();
  expect(requested.filter((p) => p.endsWith("/data/benchmark.json"))).toHaveLength(1);
  expect(requested.filter((p) => p.endsWith("/data/benchmark-items.json"))).toEqual([]);
  expect(requested.filter((p) => p.includes("/data/platforms/") || p.endsWith("/data/taxonomy.json"))).toEqual([]);

  const fresh = await page.context().newPage();
  const freshRequested: string[] = [];
  fresh.on("request", (r) => freshRequested.push(new URL(r.url()).pathname));
  await fresh.goto("/#/benchmark/items");
  await expect(countLine(fresh)).toHaveText("2621 of 2621 items");
  expect(freshRequested.filter((p) => p.endsWith("/data/benchmark.json"))).toHaveLength(1);
  expect(freshRequested.filter((p) => p.endsWith("/data/benchmark-items.json"))).toHaveLength(1);
  expect(freshRequested.filter((p) => p.includes("/data/platforms/") || p.endsWith("/data/taxonomy.json"))).toEqual([]);
  expect(errors).toEqual([]);
});

test("AC-13: Loading… until benchmark.json arrives", async ({ page }) => {
  const errors = trackErrors(page);
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    void page.route("**/data/benchmark.json", async (route) => {
      release = () => void route.continue();
      resolve();
    });
  });
  await page.goto("/#/benchmark");
  await held;
  await expect(page.getByText(`Data version ${PINNED_VERSION}`)).toBeVisible();
  await expect(page.locator("main")).toHaveText("Loading…");
  release();
  await expect(h1(page, "Benchmark chrono2023")).toBeVisible();
  await expect(page.locator("main").getByText("Loading…")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("AC-13: load failures and a malformed benchmark route", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/#/benchmark/x");
  await expect(h1(page, "Not found")).toBeVisible();
  expect(errors).toEqual([]);

  const a = await page.context().newPage();
  const aErrors = trackErrors(a);
  await a.route("**/data/benchmark.json", (route) => route.fulfill({ status: 500, body: "" }));
  await a.goto("/#/benchmark");
  await expect(a.getByRole("alert")).toHaveText(/^Could not load the benchmark data: /);
  expect(aErrors).toEqual([]);

  const b = await page.context().newPage();
  const bErrors = trackErrors(b);
  await b.route("**/data/benchmark-items.json", (route) => route.fulfill({ status: 500, body: "" }));
  await b.goto("/#/benchmark/items");
  await expect(b.getByRole("alert")).toHaveText(/^Could not load the benchmark data: /);
  expect(bErrors).toEqual([]);
});

test("AC-14: navigation link and lazy chunk", async ({ page }) => {
  const errors = trackErrors(page);
  const requested: string[] = [];
  page.on("request", (r) => requested.push(new URL(r.url()).pathname));
  const chunks = () => requested.filter((p) => /\/assets\/Benchmark[^/]*\.js$/.test(p));
  await page.goto("/#/browse");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(chunks()).toEqual([]);
  const nav = page.getByRole("navigation");
  const names = await nav.getByRole("link").allTextContents();
  expect(names.indexOf("Benchmark")).toBe(names.indexOf("Taxonomy") + 1);
  await nav.getByRole("link", { name: "Benchmark", exact: true }).click();
  expect(await hash(page)).toBe("#/benchmark");
  await expect(h1(page, "Benchmark chrono2023")).toBeVisible();
  expect(chunks()).toHaveLength(1);
  expect(errors).toEqual([]);
});

test("AC-15: no horizontal scroll at 375 px; stacked cells carry their column label", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const noScroll = () =>
    page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  const stacked = () =>
    page.locator(".benchmark table tbody td").evaluateAll((tds) =>
      tds
        .map((td) => ({
          cell: getComputedStyle(td).display,
          label: td.getAttribute("data-label"),
          before: getComputedStyle(td, "::before").content,
        }))
        .filter((c) => c.cell !== "block" || !c.label || c.before !== `"${c.label}: "`),
    );

  await page.goto("/#/benchmark");
  await expect(h1(page, "Benchmark chrono2023")).toBeVisible();
  await page.locator("details summary").click();
  expect(await page.locator("details").evaluate((d) => (d as HTMLDetailsElement).open)).toBe(true);
  expect(await noScroll()).toBe(true);
  expect(await stacked()).toEqual([]);

  await page.goto(`/#/benchmark/items?task=${TM}`);
  await expect(countLine(page)).toHaveText("983 of 983 items");
  expect(await noScroll()).toBe(true);
  expect(await stacked()).toEqual([]);
});

// Screen check at 1280 px: a table cell's text may wrap at a space, after a hyphen, or at the line-break opportunity
// after "_" or "/", never inside a word (the rule the taxonomy tables follow, SPEC-TAXO-001 REQ-016).
test("table words wrap only at spaces, hyphens, _ or / at 1280 px", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const brokenWords = () =>
    page.evaluate(() => {
      const broken: string[] = [];
      for (const cell of document.querySelectorAll(".bench-table th, .bench-table td")) {
        const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const text = node.textContent ?? "";
          let offset = 0;
          // Segments end at whitespace or after "-", "_" or "/"; each must stay on one line.
          for (const word of text.split(/(\s+)|(?<=[-_/])/).filter((s) => s !== undefined)) {
            if (word.trim() !== "") {
              const range = document.createRange();
              range.setStart(node, offset);
              range.setEnd(node, offset + word.length);
              const tops = new Set([...range.getClientRects()].map((r) => Math.round(r.top)));
              if (tops.size > 1) broken.push(word);
            }
            offset += word.length;
          }
        }
      }
      return broken;
    });

  await page.goto("/#/benchmark");
  await expect(h1(page, "Benchmark chrono2023")).toBeVisible();
  expect(await brokenWords()).toEqual([]);

  await page.goto(`/#/benchmark/items?task=${MT}`);
  await expect(countLine(page)).toHaveText("2621 of 2621 items");
  expect(await brokenWords()).toEqual([]);

  await page.goto(`/#/benchmark/items?task=${TM}`);
  await expect(countLine(page)).toHaveText("983 of 983 items");
  expect(await brokenWords()).toEqual([]);
});

// Amendment 0.4.0 (AC-10): one metric line, the models grouped by task in one table, no working label on the page.
test("AC-10 (0.4.0): reference results show one metric line and a Task | Baseline | Reference model table", async ({ page }) => {
  const errors = trackErrors(page);
  const task = (id: string) =>
    JSON.parse(
      readFileSync(join(PINNED_RELEASE_DIR, "modes", "benchmark", "tasks", `${id}.json`), "utf8"),
    ) as { metric: string; baseline_rule: string; reference_model: string };
  const [mt, tm] = [task(MT), task(TM)];
  await page.goto("/#/benchmark");
  const section = page.locator("section", { has: page.getByRole("heading", { level: 2, name: "Reference results" }) });
  await expect(section).toBeVisible();
  const paragraphs = await section.locator("p").allTextContents();
  expect(paragraphs.filter((p) => p.startsWith("Metric as recorded"))).toEqual([`Metric as recorded (both tasks): ${mt.metric}`]);
  expect(paragraphs.filter((p) => p.startsWith("Baseline:") || p.startsWith("Reference model:"))).toEqual([]);
  const models = section.locator("table", { has: page.getByRole("columnheader", { name: "Reference model", exact: true }) });
  await expect(models.locator("thead th")).toHaveText(["Task", "Baseline", "Reference model"]);
  await expect(models.locator("tbody tr")).toHaveCount(2);
  const cells = async (i: number) => models.locator("tbody tr").nth(i).locator("td").allTextContents();
  expect(await cells(0)).toEqual([MT, mt.baseline_rule, mt.reference_model.replace(" (sdl-db-02 H1)", "")]);
  expect(await cells(1)).toEqual([TM, tm.baseline_rule, tm.reference_model.replace(" (sdl-db-02 H1)", "")]);
  expect(await page.locator("main").textContent()).not.toContain("sdl-db-");
  expect(errors).toEqual([]);
});
