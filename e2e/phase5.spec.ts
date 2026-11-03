// SPEC-UI-001 phase 5 (UI AC-29 to UI AC-33): Taxonomy, Benchmark, Workflow and About in the shared components, in
// Chromium against the e2e build.
import { expect, test, type Page } from "@playwright/test";
import { CHART_TOKENS } from "../src/lib/chartTokens";

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

const main = (page: Page) => page.locator("main");
const PAGES = ["/#/taxonomy", "/#/benchmark", "/#/workflow", "/#/about"] as const;

test("UI AC-29: no bare Loading… after load; one closed How this works block per page with moved prose", async ({ page }) => {
  const errors = trackErrors(page);
  for (const url of PAGES) {
    await page.goto(url);
    await expect(main(page).locator("h1")).toBeVisible();
    const bare = await main(page).evaluate((m) =>
      [...m.querySelectorAll("*")].filter((el) => el.children.length === 0 && (el.textContent ?? "").trim() === "Loading…").length,
    );
    expect(bare, url).toBe(0);
    const how = main(page).locator("details.how-it-works");
    await expect(how, url).toHaveCount(1);
    await expect(how.locator("> summary"), url).toHaveText("How this works");
    expect(await how.evaluate((d) => (d as HTMLDetailsElement).open), url).toBe(false);
    expect(await how.locator("p").count(), url).toBeGreaterThan(0);
    // Closed: the moved prose is not shown until the visitor opens the block.
    await expect(how.locator("p").first(), url).toBeHidden();
    await how.locator("> summary").click();
    await expect(how.locator("p").first(), url).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("UI AC-30: taxonomy class page and overview show readable names with the code beside them", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/#/taxonomy/module_type/flow_reactor");
  const h1 = main(page).locator("h1");
  await expect(h1).toHaveText("Flow reactor");
  const chip = main(page).locator(".chip", { hasText: /^flow_reactor$/ });
  await expect(chip).toHaveCount(1);
  expect(await chip.evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/^"?JetBrains Mono/);
  // The chip sits right under the heading.
  expect(await h1.evaluate((el) => el.nextElementSibling?.textContent)).toBe("flow_reactor");
  await expect(page).toHaveTitle("Taxonomy: Flow reactor · SDL Workflows Explorer");

  await page.goto("/#/taxonomy");
  const link = main(page).getByRole("link", { name: "Flow reactor", exact: true });
  await expect(link).toHaveAttribute("href", "#/taxonomy/module_type/flow_reactor");
  const cell = main(page).locator("td", { has: page.getByRole("link", { name: "Flow reactor", exact: true }) });
  await expect(cell.locator(".taxo-code")).toHaveText("flow_reactor");
  await expect(cell.locator("a .taxo-code")).toHaveCount(0);
  expect(await cell.locator(".taxo-code").evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/^"?JetBrains Mono/);
  expect(errors).toEqual([]);
});

test("UI AC-31: benchmark statistics are set in Latin Modern, variables italic, numbers upright", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/#/benchmark");
  const reference = page.locator('section[aria-labelledby="bench-reference-results"] table').first();
  const rows = reference.locator("tbody tr");
  await expect(rows).toHaveCount(2);
  for (const label of ["Test items (papers)", "Baseline top-1", "Reference model top-1", "Difference (computed)", "95% interval of the difference", "Replicates"]) {
    const math = rows.locator(`td[data-label="${label}"] .math`);
    await expect(math, label).toHaveCount(2);
    const styles = await math.evaluateAll((els) => els.map((el) => [getComputedStyle(el).fontFamily, getComputedStyle(el).fontStyle]));
    for (const [family, style] of styles) {
      expect(family, label).toMatch(/^"?Latin Modern/);
      expect(style, label).toBe("normal");
    }
  }
  // Same digits, signs and brackets as before.
  await expect(rows.first().locator('td[data-label="95% interval of the difference"]')).toHaveText("[-0.0111, +0.0530]");
  // Variables in <i>, italic (the throughput counts of the workflow builder: "n = …").
  await page.goto("/#/workflow?s=dispense_solid~1&m=solid_dispenser&d=1~600");
  const n = main(page).locator('section.wf-throughput [data-kind="measured"] h4 .math i');
  await expect(n).toHaveText("n");
  expect(await n.evaluate((el) => getComputedStyle(el).fontStyle)).toBe("italic");
  expect(await n.evaluate((el) => getComputedStyle(el.parentElement!).fontFamily)).toMatch(/^"?Latin Modern/);
  expect(errors).toEqual([]);
});

test("UI AC-32: workflow steps are cards with icon buttons; a keyboard move keeps focus on the moved step", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/#/workflow");
  const m = main(page);
  const steps: [string, string][] = [["dispense_liquid", "liquid_handler"], ["react_thermal", "thermal_unit"], ["measure_optical", "instrument_optical"]];
  for (const [uo, type] of steps) {
    await m.getByLabel("Unit operation of the new step").selectOption(uo);
    await m.getByLabel("Type of its new module").selectOption(type);
    await m.getByRole("button", { name: "Add step", exact: true }).click();
  }
  const cards = m.locator('[data-list="wf-steps"] > li');
  await expect(cards).toHaveCount(3);
  await expect(m.locator('ol[data-list="wf-steps"] > li.card.wf-step')).toHaveCount(3);
  for (let i = 1; i <= 3; i++) {
    const card = cards.nth(i - 1);
    await expect(card.getByRole("heading")).toHaveText(`Step ${i}`);
    for (const label of [`Step ${i} unit operation`, `Step ${i} module`, `Step ${i} samples per run`]) {
      await expect(card.getByLabel(label, { exact: true })).toHaveCount(1);
    }
    for (const name of [`Move step ${i} up`, `Move step ${i} down`, `Remove step ${i}`]) {
      const button = card.getByRole("button", { name, exact: true });
      await expect(button).toHaveAttribute("aria-label", name);
      await expect(button).toHaveAttribute("title", name);
      await expect(button.locator("svg")).toHaveCount(1);
    }
  }
  await expect(m.getByRole("button", { name: "Move step 1 up", exact: true })).toBeDisabled();
  await expect(m.getByRole("button", { name: "Move step 3 down", exact: true })).toBeDisabled();
  await expect(m.locator('table[data-table="wf-steps"]')).toHaveCount(0);

  await m.getByRole("button", { name: "Move step 3 up", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(m.getByLabel("Step 2 unit operation", { exact: true })).toHaveValue("measure_optical");
  await expect(m.getByLabel("Step 3 unit operation", { exact: true })).toHaveValue("react_thermal");
  const up2 = cards.nth(1).getByRole("button", { name: "Move step 2 up", exact: true });
  await expect(up2).toBeFocused();

  // Moving to the top: the up button is now disabled, so focus goes to the other move button.
  await page.keyboard.press("Enter");
  await expect(m.getByLabel("Step 1 unit operation", { exact: true })).toHaveValue("measure_optical");
  await expect(cards.nth(0).getByRole("button", { name: "Move step 1 down", exact: true })).toBeFocused();

  await m.getByRole("button", { name: "Remove step 1", exact: true }).click();
  await expect(cards).toHaveCount(2);
  await expect(m.getByLabel("Step 1 unit operation", { exact: true })).toHaveValue("dispense_liquid");
  expect(errors).toEqual([]);
});

test("UI AC-33: no sideways scroll at 375 px on the phase 5 pages", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const url of ["/#/taxonomy", "/#/taxonomy/module_type/flow_reactor", "/#/benchmark", "/#/workflow", "/#/about"]) {
    await page.goto(url);
    await expect(main(page).locator("h1")).toBeVisible();
    const how = main(page).locator("details.how-it-works");
    if ((await how.count()) > 0) await how.locator("> summary").click();
    const { scroll, client } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(scroll, url).toBeLessThanOrEqual(client);
  }
  // The builder with steps (cards and icon buttons) and its outputs.
  await page.goto("/#/workflow?s=dispense_liquid~1,react_thermal~2,measure_optical~3&m=liquid_handler,thermal_unit,instrument_optical");
  await expect(main(page).locator('[data-list="wf-steps"] > li')).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

const rgb = (hex: string) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;

test("UI AC-34: workflow charts take the chart tokens in both themes, readable names and Latin Modern statistics", async ({ page }) => {
  const errors = trackErrors(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  const url = "/#/workflow?s=react_flow~1,measure_separation_ms~2&m=flow_reactor,instrument_separation_ms" +
    "&t=1~robot_arm_gantry~30&n=4&runs=5&seed=7";
  for (const theme of ["light", "dark"] as const) {
    const tokens = CHART_TOKENS[theme];
    await page.emulateMedia({ colorScheme: theme });
    await page.goto(url);
    const m = main(page);
    await m.locator("section.wf-sim").getByRole("button", { name: "Run simulation" }).click();
    await expect(m.locator(".wf-timeline svg")).toHaveCount(1);
    // Every chart on the page: axis text, tick marks and gridlines in the token colours.
    const charts = m.locator(".wf-timeline svg, .wf-strip svg");
    expect(await charts.count(), theme).toBeGreaterThanOrEqual(4);
    const colours = await charts.evaluateAll((svgs) =>
      svgs.map((svg) => {
        const css = (sel: string, prop: "fill" | "stroke") =>
          [...svg.querySelectorAll(sel)].map((el) => getComputedStyle(el)[prop]);
        return {
          text: [...css('g[aria-label="x-axis tick label"] text', "fill"), ...css('g[aria-label="x-axis label"] text', "fill")],
          ticks: css('g[aria-label="x-axis tick"] path', "stroke"),
          grid: css('g[aria-label="x-grid"] line', "stroke"),
        };
      }),
    );
    for (const [k, c] of colours.entries()) {
      expect(c.text.length, `${theme} chart ${k} text`).toBeGreaterThan(0);
      expect(new Set(c.text), `${theme} chart ${k} text`).toEqual(new Set([rgb(tokens["--chart-ink-secondary"]!)]));
      expect(c.ticks.length, `${theme} chart ${k} ticks`).toBeGreaterThan(0);
      expect(new Set(c.ticks), `${theme} chart ${k} ticks`).toEqual(new Set([rgb(tokens["--chart-axis"]!)]));
      expect(c.grid.length, `${theme} chart ${k} grid`).toBeGreaterThan(0);
      expect(new Set(c.grid), `${theme} chart ${k} grid`).toEqual(new Set([rgb(tokens["--chart-grid"]!)]));
    }
    // Gantt rows: the device's module type by its readable name, the code in the title.
    const row = m.locator(".wf-timeline svg text", { hasText: "Module 1 (Flow reactor), device 1" });
    await expect(row).toHaveCount(1);
    expect(await row.locator("title").textContent()).toContain("flow_reactor");
    expect(await row.evaluate((el) => getComputedStyle(el).fill)).toBe(rgb(tokens["--chart-ink-secondary"]!));
  }

  const m = main(page);
  // The strip of step 1 is headed by the readable unit operation; the code stays in the title.
  const heading = m.locator('section[data-step="1"] h3 [data-code="react_flow"]');
  await expect(heading).toHaveAttribute("title", "react_flow");
  await expect(heading).toContainText("Flow reaction");
  // Statistics in Latin Modern: n of the strip, the cycle-time range and the simulation results.
  const n = m.locator('section[data-step="1"] .wf-n .math i');
  await expect(n).toHaveText("n");
  for (const [sel, count] of [['[data-value="cycle"]', 1], ['[data-value="makespan"] .math', 1], ['[data-value="sim-per-day"] .math', 3]] as const) {
    const el = m.locator(sel);
    await expect(el, sel).toHaveCount(count);
    const families = await el.evaluateAll((els) => els.map((e) => getComputedStyle(e).fontFamily));
    for (const family of families) expect(family, sel).toMatch(/^"?Latin Modern/);
  }
  await expect(m.locator('[data-value="cycle"]')).toHaveClass(/\bmath\b/);
  expect(errors).toEqual([]);
});
