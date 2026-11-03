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
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/#/platform/Kim2026/P1");
    await page.waitForFunction(() => (window as Win).__cy !== undefined);
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
