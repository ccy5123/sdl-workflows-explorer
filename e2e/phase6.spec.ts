// UI AC-42 to AC-46: the phase 6 leftovers of SPEC-UI-001, in Chromium against the e2e build.
import { expect, test, type Page } from "@playwright/test";
import type { Core } from "cytoscape";

type Win = Window & { __cy?: Core; __wfCy?: Core };

const main = (page: Page) => page.locator("main");

test("UI AC-42: platform tables name module types and transfer modes, the code in title", async ({ page }) => {
  await page.goto("/#/platform/Aand2024/P1");
  const type = main(page).locator('[data-table="modules"] tbody tr td:nth-child(2) .label').first();
  await expect(type).toHaveAttribute("title", /^[a-z_]+$/);
  expect(await type.evaluate((el) => (el.firstChild?.textContent ?? "").includes("_"))).toBe(false);
  const mode = main(page).locator('[data-table="connections"] tbody tr td:nth-child(3) .label').first();
  await expect(mode).toHaveAttribute("title", "fixed_tubing");
  await expect(mode).toContainText("Fixed tubing");
});

test("UI AC-43: workflow results name unit operations and module types; the sentence wording is kept", async ({ page }) => {
  await page.goto(
    "/#/workflow?s=react_flow~1,measure_separation_ms~2&m=flow_reactor,instrument_separation_ms&t=1~robot_arm_gantry~30&n=4&runs=5&seed=7",
  );
  const m = main(page);
  await expect(m.locator('table[data-table="wf-range"] tbody tr').first().locator(".label")).toHaveAttribute("title", "react_flow");
  await m.getByRole("button", { name: "Run simulation" }).click();
  const results = m.locator('[data-result="simulation"]');
  const sentence = results.locator('[data-value="bottleneck"]');
  await expect(sentence).toContainText(/Step \d \((Flow reaction|Separation \/ MS measurement)\) on module \d \((Flow reactor|Separation \/ MS instrument)\), [\d.]+%\./);
  expect(await sentence.textContent()).not.toContain("_");
  for (const name of ["wf-utilization", "wf-waiting"]) {
    const cells = await results.locator(`table[data-table="${name}"] tbody td:first-child`).allTextContents();
    expect(cells.length, name).toBe(2);
    expect(cells.some((c) => c.includes("_")), `${name}: ${cells.join(" | ")}`).toBe(false);
  }
  await results.locator(".wf-events summary").click();
  const device = results.locator('table[data-table="wf-events"] tbody tr').first().locator("td").nth(2);
  await expect(device).toHaveText("Module 1 (Flow reactor), device 1");
  await expect(device).toHaveAttribute("title", "Module 1 (flow_reactor), device 1");
});

test("UI AC-44: benchmark tasks by readable name with the id beside; items explorer options and families", async ({ page }) => {
  await page.goto("/#/benchmark");
  const section = main(page).getByRole("region", { name: "Transfer mode of a material connection", exact: true });
  await expect(section.locator(".bench-task-id code")).toHaveText("chrono2023-transfer_mode");
  await expect(main(page).locator('table[aria-label="Split"] thead th').nth(2)).toHaveText("Module type itemschrono2023-module_type");
  await page.goto("/#/benchmark/items?task=chrono2023-transfer_mode");
  await expect(main(page).getByLabel("Task").locator("option:checked")).toHaveText(
    "Transfer mode of a material connection (chrono2023-transfer_mode)",
  );
  const family = main(page).locator('td[data-label="From family"] .label').first();
  await expect(family).toHaveAttribute("title", /^[a-z_]+$/);
  expect(await family.evaluate((el) => /^[A-Z]/.test(el.firstChild?.textContent ?? ""))).toBe(true);
});

test("UI AC-45: the class page names the family, the code in title", async ({ page }) => {
  await page.goto("/#/taxonomy/unit_operation/sonicate");
  const dd = main(page).locator("dl.taxo-facts dd .label");
  await expect(dd).toHaveAttribute("title", "mix");
  await expect(dd).toContainText("Mix");
});

test("UI AC-51: the comparison names module types, transfer modes and unit operations, the code in title", async ({ page }) => {
  await page.goto("/#/compare/Aand2024/P1,Li2020/P1");
  const m = main(page);
  await expect(m.locator('[data-table="compare-modules"] tbody th [data-code="instrument_optical"]')).toContainText("Optical instrument");
  await expect(m.locator('[data-table="compare-transfers"] tbody th [data-code="robot_arm_gantry"]')).toContainText("Robot arm / gantry");
  await expect(m.locator(".compare-steps td .label").first()).toHaveAttribute("title", "dispense_liquid");
  await expect(m.locator(".compare-steps td .label").first()).toContainText("Dispense liquid");
});

test("UI AC-46: selecting a step scrolls the graph into view; hovering does not move the page", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#/platform/Kim2026/P1");
  const steps = main(page).locator("button.step");
  const last = steps.last();
  await last.scrollIntoViewIfNeeded();
  const graphShown = () =>
    page.evaluate(() => {
      const r = document.querySelector(".graph-wrap")!.getBoundingClientRect();
      return (Math.min(r.bottom, innerHeight) - Math.max(r.top, 88)) / r.height;
    });
  expect(await graphShown()).toBeLessThan(0.5);
  const before = await page.evaluate(() => scrollY);
  await last.hover();
  expect(await page.evaluate(() => scrollY)).toBe(before);
  await last.click();
  await expect.poll(graphShown).toBeGreaterThan(0.95);
  // The step is selected, so its modules stay highlighted in the graph that is now in view.
  await expect(last).toHaveAttribute("aria-pressed", "true");

  // From the keyboard: Escape clears; Enter on a step scrolls the graph into view again.
  await page.keyboard.press("Escape");
  await last.scrollIntoViewIfNeeded();
  await last.focus();
  expect(await graphShown()).toBeLessThan(0.5);
  await page.keyboard.press("Enter");
  await expect.poll(graphShown).toBeGreaterThan(0.95);
});

async function fillFrom(page: Page, platformId: string) {
  const m = main(page);
  await m.getByLabel("Start from a coded platform").selectOption(platformId);
  await m.getByRole("button", { name: "Fill the builder from this platform" }).click();
  await page.waitForFunction(() => (window as Win).__wfCy !== undefined);
}

test("UI AC-47: at 375 px the fitted workflow graph keeps every caption clear of the toolbar", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/#/workflow");
  await fillFrom(page, "Aand2024/P1");
  const m = main(page);
  await m.locator(".wf-graph-box").scrollIntoViewIfNeeded();
  const clash = () =>
    page.evaluate(() => {
      const bar = document.querySelector(".wf-graph-box .graph-toolbar")!.getBoundingClientRect();
      const hit = (r: DOMRect) => r.width > 0 && r.left < bar.right && r.right > bar.left && r.top < bar.bottom && r.bottom > bar.top;
      return [...document.querySelectorAll<HTMLElement>(".wf-graph-box .graph-caption")]
        .filter((c) => hit(c.getBoundingClientRect()))
        .map((c) => c.textContent);
    });
  await expect.poll(clash).toEqual([]);
  // The whole graph is in view: no minimap.
  await expect(m.locator(".wf-graph-box .graph-minimap")).toHaveCount(0);
});

/** Labels of parallel edges whose box meets a module's label box, as "edge label / module label". */
const bundleClashes = (page: Page, key: "__cy" | "__wfCy") =>
  page.evaluate((k) => {
    const cy = (window as Win)[k]!;
    const labelBox = { includeNodes: false, includeEdges: false, includeLabels: true, includeOverlays: false } as const;
    type Box = { x1: number; x2: number; y1: number; y2: number };
    const meet = (a: Box, b: Box) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
    const out: string[] = [];
    cy.edges(".bundled").forEach((e) => {
      const eb = e.boundingBox(labelBox);
      cy.nodes(".module").forEach((n) => {
        if (meet(eb, n.boundingBox(labelBox))) out.push(`${e.data("label")} / ${n.data("label")}`);
      });
    });
    return { bundled: cy.edges(".bundled").length, out };
  }, key);

test("UI AC-48: on Kim2026/P1 the labels of parallel edges stay off the module labels", async ({ page }) => {
  // Four graphs, each laid out by a force simulation that animates before it rests.
  test.setTimeout(180_000);
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/#/platform/Kim2026/P1");
    // On a phone the full graph opens on the whole screen from the focus view.
    if (width < 800) await main(page).getByRole("button", { name: "Whole graph", exact: true }).click();
    // Measured once the force layout has come to rest (src/lib/forceLayout.ts).
    await page.waitForFunction(() => (window as Win).__cy?.scratch("_forceSettled") === true, null, { timeout: 60_000 });
    const viewer = await bundleClashes(page, "__cy");
    expect(viewer.bundled, `${width} px`).toBeGreaterThan(0);
    expect(viewer.out, `viewer at ${width} px`).toEqual([]);

    await page.goto("/#/workflow");
    await fillFrom(page, "Kim2026/P1");
    const preview = await bundleClashes(page, "__wfCy");
    expect(preview.bundled, `${width} px`).toBeGreaterThan(0);
    expect(preview.out, `workflow preview at ${width} px`).toEqual([]);
  }
  // A graph without parallel edges keeps the default spacing.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#/platform/Aand2024/P1");
  await page.waitForFunction(() => (window as Win).__cy !== undefined);
  expect((await bundleClashes(page, "__cy")).bundled).toBe(0);
});

test("UI AC-50: keyboard — the legend closes on Escape; the Columns popover takes focus; overlays hand focus back", async ({ page }) => {
  await page.goto("/#/platform/Aand2024/P1");
  const legendButton = page.getByRole("button", { name: "Legend" });
  await legendButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".legend")).toBeVisible();
  // The legend scrolls inside itself, so it is reachable by Tab.
  await page.locator(".legend").focus();
  await page.keyboard.press("Escape");
  await expect(page.locator(".legend")).toBeHidden();
  await expect(legendButton).toBeFocused();

  // The evidence sheet opened from a table row closes on Escape and gives focus back to the row.
  const row = main(page).locator('[data-table="modules"] tbody tr').first();
  await row.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".evidence-sheet")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".evidence-sheet")).toHaveCount(0);
  await expect(row).toBeFocused();

  await page.goto("/#/browse");
  const columns = main(page).getByRole("button", { name: /^Columns · \d+$/ });
  await columns.focus();
  await page.keyboard.press("Enter");
  const focused = page.locator(":focus");
  await expect(focused).toHaveAttribute("type", "checkbox");
  await expect(focused).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(columns).toBeFocused();
  await expect(columns).toHaveAttribute("aria-expanded", "false");
});

/** Right edge of the last header cell against the right edge of its scroll box, and the box's scroll widths. */
const lastColumn = (page: Page, table: string) =>
  page.locator(`[data-table="${table}"]`).evaluate((t) => {
    const box = t.closest(".table-scroll")!;
    const last = [...t.querySelectorAll("thead th")].at(-1)!;
    return {
      lastRight: last.getBoundingClientRect().right,
      boxRight: box.getBoundingClientRect().right,
      scroll: box.scrollWidth,
      client: box.clientWidth,
      frame: box.parentElement!.className,
    };
  });
const pageOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test("UI AC-52: Browse tables fit their box at 1440 px; narrower, they scroll inside it with a cue; phones show cards", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [hash, table] of [["#/browse", "papers"], ["#/browse?view=platforms", "platforms"]] as const) {
    await page.goto(`/${hash}`);
    const m = await lastColumn(page, table);
    expect(m.lastRight, `${table}: last column inside the box`).toBeLessThanOrEqual(m.boxRight + 0.5);
    expect(m.scroll, table).toBeLessThanOrEqual(m.client);
    await expect(main(page).locator(".table-more")).toHaveCount(0);
  }

  await page.setViewportSize({ width: 900, height: 812 });
  await page.goto("/#/browse");
  const narrow = await lastColumn(page, "papers");
  expect(narrow.scroll).toBeGreaterThan(narrow.client);
  expect(narrow.frame).toContain("more-right");
  await expect(main(page).locator(".table-more")).toHaveText("Scroll sideways for more columns");
  expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
  // Scrolled to the end, the right fade goes and the left one comes.
  await main(page).locator(".table-scroll-sticky").evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
  await expect.poll(async () => (await lastColumn(page, "papers")).frame).toContain("more-left");
  expect((await lastColumn(page, "papers")).frame).not.toContain("more-right");

  // At 375 px each row is a card: nothing scrolls sideways, so there is no cue, and sorting is one select.
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/#/browse");
  const phone = await lastColumn(page, "papers");
  expect(phone.scroll).toBeLessThanOrEqual(phone.client);
  await expect(main(page).locator(".table-more")).toHaveCount(0);
  const first = main(page).locator('[data-table="papers"] tbody tr').first();
  expect(await first.evaluate((tr) => getComputedStyle(tr).display)).toBe("flex");
  await expect(first.locator("td.card-title")).toContainText("Autonomous closed-loop");
  await main(page).getByLabel("Sort").selectOption({ label: "Year, high to low" });
  await expect(main(page).locator('[data-table="papers"] tbody tr').first().locator("td.card-aside")).toHaveText("2026");
  // The cards come 25 at a time; a filter starts again from the first 25.
  const cards = main(page).locator('[data-table="papers"] tbody tr');
  await expect(cards).toHaveCount(25);
  await main(page).getByRole("button", { name: "Show 25 more", exact: true }).click();
  await expect(cards).toHaveCount(50);
  await main(page).getByLabel("Search ids, titles and platform names").fill("flow");
  await expect.poll(() => cards.count()).toBeLessThanOrEqual(25);
  expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
});

test("UI AC-53: at 375 px the builder's module and transfer fields stay inside their box", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/#/workflow");
  await fillFrom(page, "Kim2026/P1");
  // On a phone each module and transfer is a summary row; open them all to see their fields.
  for (const t of await main(page).locator('[data-table="wf-modules"] .wf-row-toggle, [data-table="wf-transfers"] .wf-row-toggle').all()) {
    await t.click();
  }
  const inside = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-table="wf-modules"], [data-table="wf-transfers"]')].map((t) => {
      const box = t.closest(".table-scroll")!.getBoundingClientRect();
      const out = [...t.querySelectorAll<HTMLElement>("select, input, button")].filter((f) => f.getBoundingClientRect().right > box.right + 0.5);
      return { table: t.dataset.table, scroll: t.closest(".table-scroll")!.scrollWidth - t.closest(".table-scroll")!.clientWidth, out: out.length };
    }),
  );
  expect(inside).toEqual([
    { table: "wf-modules", scroll: 0, out: 0 },
    { table: "wf-transfers", scroll: 0, out: 0 },
  ]);
  expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
  // Each field keeps a visible name above it.
  const typeCell = main(page).locator('[data-table="wf-modules"] td[data-label="Module type"]').first();
  expect(await typeCell.evaluate((el) => getComputedStyle(el, "::before").content)).toBe('"Module type"');
});

test("UI AC-54: builder messages sit in the flow after the part they come from and cover nothing", async ({ page }) => {
  for (const [width, height] of [[1440, 900], [375, 812]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/#/workflow");
    await fillFrom(page, "Aand2024/P1");
    const note = main(page).locator(".wf-message", { hasText: "Filled from Aand2024/P1" });
    await expect(note).toBeVisible();
    // Shown right after the "Fill the builder" controls, not stuck to the window.
    await expect(main(page).locator('[data-msg-slot="start"] .wf-message')).toHaveCount(1);
    expect(await note.evaluate((el) => getComputedStyle(el.parentElement!).position)).toBe("static");
    // Scrolled down, nothing of the builder is under it.
    await main(page).locator(".wf-steps").evaluate((el) => el.scrollIntoView({ block: "center" }));
    const below = await note.boundingBox();
    expect(below === null || below.y + below.height <= 0, `${width} px: message still in view after scrolling`).toBe(true);

    // A refusal shows after the part of the field that caused it (on a phone module 1's row opens first).
    if (width < 800) await main(page).getByRole("button", { name: /^Module 1: / }).click();
    const devices = main(page).getByLabel("Module 1 devices");
    await devices.fill("51");
    await devices.press("Enter");
    await expect(main(page).locator('[data-msg-slot="modules"] .wf-error')).toContainText("Devices must be a whole number from 1 to 50.");
    await expect(main(page).locator('[data-msg-slot="start"] .wf-message')).toHaveCount(0);
  }
});
