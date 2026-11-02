// SPEC-SIM-001 AC-5 to AC-8 and the outputs of AC-9 to AC-16 in Chromium against the e2e build.
import { expect, test, type Page } from "@playwright/test";

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

const main = (page: Page) => page.locator("main");

async function fill(page: Page, label: string, value: string) {
  const field = main(page).getByLabel(label, { exact: true });
  await field.fill(value);
  await field.press("Enter");
}

test("AC-5, AC-6: empty builder, title and nav; build, edit and refuse values", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/#/workflow");
  await expect(main(page).locator("h1")).toHaveText("Workflow builder");
  await expect(page).toHaveTitle("Workflow builder · SDL Workflows Explorer");
  const nav = page.locator("nav.site-nav a");
  await expect(nav).toHaveText(["SDL Workflows Explorer", "Home", "Browse", "Trends", "Taxonomy", "Benchmark", "Workflow", "About"]);
  await expect(page.locator('nav.site-nav a[aria-current="page"]')).toHaveText("Workflow");
  await expect(main(page)).toContainText("Add at least one step to see the three outputs.");

  const m = main(page);
  await m.getByLabel("Unit operation of the new step").selectOption("dispense_liquid");
  await m.getByLabel("Type of its new module").selectOption("liquid_handler");
  await m.getByRole("button", { name: "Add step" }).click();
  await m.getByLabel("Unit operation of the new step").selectOption("react_thermal");
  await m.getByLabel("Type of its new module").selectOption("thermal_unit");
  await m.getByRole("button", { name: "Add step" }).click();
  await m.getByLabel("Unit operation of the new step").selectOption("measure_optical");
  await m.getByLabel("Type of its new module").selectOption("instrument_optical");
  await m.getByRole("button", { name: "Add step" }).click();
  await expect(m.locator('table[data-table="wf-steps"] tbody tr')).toHaveCount(3);
  await expect(m).not.toContainText("Add at least one step");

  await m.getByRole("button", { name: "Move step 3 up" }).click();
  await m.getByRole("button", { name: "Remove step 1" }).click();
  await expect(m.getByLabel("Step 1 unit operation")).toHaveValue("measure_optical");
  await expect(m.getByLabel("Step 2 unit operation")).toHaveValue("react_thermal");
  await m.getByLabel("Transfer mode between steps 1 and 2").selectOption("robot_arm_gantry");
  await fill(page, "Transfer time between steps 1 and 2, seconds", "12.5");
  await fill(page, "Batch size (experiments proposed and run together, 1 to 10,000)", "8");
  await fill(page, "Parallel units (batches that can be in progress at once, 1 to 50)", "2");
  await expect(page).toHaveURL(/b=8/);

  await fill(page, "Batch size (experiments proposed and run together, 1 to 10,000)", "10001");
  await expect(m.locator(".wf-error")).toContainText("Batch size must be a whole number from 1 to 10,000.");
  await expect(m.getByLabel("Batch size (experiments proposed and run together, 1 to 10,000)")).toHaveValue("8");
  await fill(page, "Module 1 devices", "51");
  await expect(m.locator(".wf-error")).toContainText("Devices must be a whole number from 1 to 50.");
  await expect(m.getByLabel("Module 1 devices")).toHaveValue("1");

  // AC-7: the URL restores every input
  const url = page.url();
  await page.goto("about:blank");
  await page.goto(url);
  await expect(m.getByLabel("Step 1 unit operation")).toHaveValue("measure_optical");
  await expect(m.getByLabel("Step 2 unit operation")).toHaveValue("react_thermal");
  await expect(m.getByLabel("Transfer mode between steps 1 and 2")).toHaveValue("robot_arm_gantry");
  await expect(m.getByLabel("Transfer time between steps 1 and 2, seconds")).toHaveValue("12.5");
  await expect(m.getByLabel("Batch size (experiments proposed and run together, 1 to 10,000)")).toHaveValue("8");
  await expect(m.getByLabel("Parallel units (batches that can be in progress at once, 1 to 50)")).toHaveValue("2");
  expect(errors).toEqual([]);
});

test("AC-7: parts of a link that do not parse are named once", async ({ page }) => {
  await page.goto("/#/workflow?s=dispense_liquid~1,teleport~1&m=fluidics&b=abc");
  await expect(main(page).locator(".wf-message").first()).toHaveText("Ignored from the link: s=teleport~1, b=abc.");
  await expect(main(page).getByLabel("Step 1 unit operation")).toHaveValue("dispense_liquid");
  await expect(page).toHaveURL(/#\/workflow\?s=dispense_liquid~1&m=fluidics$/);
});

test("AC-8: start from a coded platform", async ({ page }) => {
  await page.goto("/#/workflow");
  const m = main(page);
  await m.getByLabel("Start from a coded platform").selectOption("Aand2024/P1");
  await m.getByRole("button", { name: "Fill the builder from this platform" }).click();
  await expect(m.locator('table[data-table="wf-steps"] tbody tr')).toHaveCount(6);
  await expect(m.locator(".wf-message")).toContainText("Filled from Aand2024/P1: steps and their unit operations");
});

test("AC-9, AC-10: similar platforms, sorting, more rows and the compare link", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/#/workflow");
  const m = main(page);
  await m.getByLabel("Start from a coded platform").selectOption("Aand2024/P1");
  await m.getByRole("button", { name: "Fill the builder from this platform" }).click();
  const section = m.locator("section", { has: page.getByRole("heading", { name: "Similar platforms" }) });
  await expect(section.locator("dl.wf-measures dt")).toHaveText(["Step order", "Module types", "Transfer modes"]);
  const rows = section.locator('table[data-table="wf-similar"] tbody tr');
  await expect(rows).toHaveCount(10);
  const own = section.locator('tr[data-platform="Aand2024/P1"]');
  await expect(own.locator("td.num").nth(1)).toHaveText("1.00");
  await expect(own.locator("td.num").nth(2)).toHaveText("1.00");
  await expect(own.locator("td.num").nth(3)).toHaveText("1.00");
  await expect(own.getByRole("link", { name: "Aand2024/P1" })).toHaveAttribute("href", "#/platform/Aand2024/P1");
  await section.getByRole("button", { name: "Show 10 more" }).click();
  await expect(rows).toHaveCount(20);

  await section.getByRole("button", { name: "Year" }).click();
  await expect(section.locator('th[aria-sort="ascending"]')).toHaveText("Year");
  const years = await rows.locator("td:nth-child(5)").allTextContents();
  expect(years.map(Number)).toEqual([...years.map(Number)].sort((a, b) => a - b));

  const ids = await rows.locator("td:nth-child(2)").allTextContents();
  await section.getByLabel(`Select ${ids[0]}`).check();
  await expect(section.locator(".wf-compare")).toHaveText("Select 2 or 3 platforms to compare them side by side (1 selected).");
  await section.getByLabel(`Select ${ids[1]}`).check();
  const link = section.locator(".wf-compare a");
  await expect(link).toHaveAttribute("href", `#/compare/${ids[0]},${ids[1]}`);
  await section.getByLabel(`Select ${ids[2]}`).check();
  await section.getByLabel(`Select ${ids[3]}`).check();
  await expect(section.locator(".wf-compare")).toHaveText("The comparison takes 2 or 3 platforms; 4 are selected.");
  await section.getByLabel(`Select ${ids[3]}`).uncheck();
  await section.locator(".wf-compare a").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Compare/);
  expect(errors).toEqual([]);
});

test("AC-11, AC-12: missing duration, entered value, distributions, sources and joint durations", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/#/workflow?s=dispense_solid~1&m=solid_dispenser");
  const m = main(page);
  const result = m.locator('[data-result="range"]');
  await expect(result).toContainText("No cycle time yet: step 1 (dispense_solid) has no recorded duration");
  await expect(result.locator('[data-value="cycle"]')).toHaveCount(0);
  await fill(page, "Your duration for step 1, seconds (empty: use the recorded values)", "120");
  await expect(result.locator('[data-value="cycle"]')).toHaveText("2 min");
  await expect(result).toContainText("These include the duration entered by you for step 1.");
  await expect(m.locator('table[data-table="wf-range"] tbody tr').first()).toContainText("entered by you");

  await page.goto("/#/workflow?s=dispense_liquid~1,react_thermal~2&m=liquid_handler,thermal_unit");
  const step2 = m.locator('section[data-step="2"]');
  await expect(step2.locator(".wf-n")).toContainText("n = 70 recorded; 68 used, 2 bounds left out");
  await expect(step2.locator(".wf-strip svg")).toHaveCount(1);
  await step2.locator(".wf-sources summary").click();
  const sources = step2.locator('table[data-table="wf-sources"] tbody tr');
  await expect(sources).toHaveCount(70);
  await expect(sources.first().locator('a[href^="#/platform/"]')).toHaveCount(1);
  await expect(sources.first().locator('a[href^="https://doi.org/"]')).toHaveCount(1);
  await expect(step2.locator('table[data-table="wf-sources"]')).toContainText("≤");

  const step1 = m.locator('section[data-step="1"]');
  await step1.locator(".wf-offers summary").click();
  const offers = step1.locator(".wf-offers li");
  await expect(offers).toHaveCount(4);
  await offers.first().getByRole("button").click();
  await expect(m.locator('table[data-table="wf-range"] tbody tr').nth(0)).toContainText("joint duration");
  await expect(m.locator('table[data-table="wf-range"] tbody tr').nth(1)).toContainText("inside a joint duration");
  await expect(page).toHaveURL(/j=1~/);
  expect(errors).toEqual([]);
});

test("AC-11, AC-13: per-day values, the 0 s case and recorded throughputs", async ({ page }) => {
  await page.goto("/#/workflow?s=dispense_solid~1&m=solid_dispenser&b=2&p=3&d=1~600");
  const m = main(page);
  await expect(m.locator('[data-value="per-day"]')).toHaveText("864, 864, 864");
  await expect(m.locator('[data-result="range"]')).toContainText("assumes the parallel units never wait for a shared module");
  const panel = m.locator("section.wf-throughput");
  const sim = (await page.evaluate(() => fetch("data/simulation.json").then((r) => r.json()))) as {
    throughputs: { kind: string; per_day: number | null }[];
  };
  const n = (kind: string) => sim.throughputs.filter((t) => t.kind === kind && t.per_day !== null).length;
  await expect(panel.locator('[data-kind="measured"] h4')).toHaveText(`Measured throughputs, n = ${n("measured")}`);
  await expect(panel.locator('[data-kind="nominal"] h4')).toHaveText(`Nominal throughputs, n = ${n("nominal")}`);
  await expect(panel.locator("summary").nth(1)).toHaveText("9 throughputs have no per-day value");
  await panel.locator("summary").nth(1).click();
  await expect(panel.locator('table[data-table="wf-not-converted"] tbody tr')).toHaveCount(9);

  await page.goto("/#/workflow?s=dispense_solid~1&m=solid_dispenser&d=1~0");
  await expect(m.locator('[data-value="per-day"]')).toHaveText(
    "not defined: the cycle time is 0 s, not defined: the cycle time is 0 s, not defined: the cycle time is 0 s",
  );
});

test("AC-15, AC-16: simulation inputs, results, timeline, events and determinism after reload", async ({ page }) => {
  const errors = trackErrors(page);
  const url = "/#/workflow?s=react_flow~1,measure_separation_ms~2&m=flow_reactor,instrument_separation_ms" +
    "&t=1~robot_arm_gantry~30&n=4&runs=5&seed=7";
  await page.goto(url);
  const m = main(page);
  const section = m.locator("section.wf-sim");
  const inputs = section.locator('[data-list="assumptions"]');
  await expect(inputs).toContainText("Transfer modes and times (default: not specified, 0 s)");
  await expect(inputs).toContainText("steps 1 and 2: robot_arm_gantry, 30 s");
  await expect(section.getByLabel("Transfer agents: robot arm or gantry")).toHaveValue("1");
  await expect(section.getByLabel("Queue rule (default: first come, first served)")).toHaveValue("fifo");
  await expect(section.getByLabel("Batches, 1 to 500 (default 10)")).toHaveValue("4");
  await expect(section.getByLabel("Seed, 0 to 4,294,967,295 (default 1)")).toHaveValue("7");
  await expect(section.locator('[data-list="workflow-inputs"]')).toContainText("Devices per module (default 1)");
  await expect(section.locator('[data-list="rules"]')).toContainText("A chosen joint duration counts as one step");
  await expect(section.locator('[data-list="rules"]')).toContainText("A batch keeps its device for the next step");

  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await section.getByRole("button", { name: "Run simulation" }).click();
  const results = section.locator('[data-result="simulation"]');
  await expect(results.locator(".wf-depends")).toContainText("These results follow from the inputs listed above");
  expect(requests).toEqual([]);
  const first = {
    makespan: await results.locator('[data-value="makespan"]').textContent(),
    perDay: await results.locator('[data-value="sim-per-day"]').textContent(),
    bottleneck: await results.locator('[data-value="bottleneck"]').textContent(),
  };
  await expect(results.locator('table[data-table="wf-utilization"] tbody tr')).toHaveCount(2);
  await expect(results.locator('table[data-table="wf-waiting"] tbody tr')).toHaveCount(2);
  await expect(results.locator('[data-value="bottleneck"]')).toContainText("the step whose module has the highest median utilization");
  await expect(results.locator(".wf-timeline svg")).toHaveCount(1);
  await expect(results.locator(".wf-timeline svg")).toHaveAttribute("aria-label", /on 3 rows of devices and transfer agents/);
  await results.locator(".wf-events summary").click();
  // 4 batches × (2 steps + 1 transfer)
  await expect(results.locator('table[data-table="wf-events"] tbody tr')).toHaveCount(12);

  await page.goto("about:blank");
  await page.goto(url);
  await section.getByRole("button", { name: "Run simulation" }).click();
  await expect(results.locator('[data-value="makespan"]')).toHaveText(first.makespan!);
  await expect(results.locator('[data-value="sim-per-day"]')).toHaveText(first.perDay!);
  await expect(results.locator('[data-value="bottleneck"]')).toHaveText(first.bottleneck!);
  expect(errors).toEqual([]);
});

test("AC-15: too many step runs are refused before running", async ({ page }) => {
  await page.goto("/#/workflow?s=react_flow~1&m=flow_reactor&b=10000&k=1~1&n=500&runs=100");
  const section = main(page).locator("section.wf-sim");
  await expect(section.locator(".wf-missing")).toContainText("These inputs need 500,000,000 step runs");
  await expect(section.getByRole("button", { name: "Run simulation" })).toBeDisabled();
});
