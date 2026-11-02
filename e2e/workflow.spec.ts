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
