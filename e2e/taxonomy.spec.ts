// SPEC-TAXO-001 AC-11 to AC-13, AC-15 and AC-16: the taxonomy overview and class pages in Chromium against the e2e build.
import { expect, test, type Page } from "@playwright/test";

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

const hash = (page: Page) => page.evaluate(() => window.location.hash);
const countLine = (page: Page) => page.locator('.browse [aria-live="polite"]');
const region = (page: Page, name: string) => page.getByRole("region", { name, exact: true });
const link = (page: Page, name: string) => page.getByRole("link", { name, exact: true });
const h1 = (page: Page, name: string) => page.getByRole("heading", { level: 1, name, exact: true });
const CAPTION =
  "The 69 classes of the release taxonomy: 10 field tags, 22 module types, 6 transfer modes and 31 unit operations. " +
  "Item counts are papers for field tags, modules for module types, connections for transfer modes and steps for unit operations.";

/** Follows a link on the current page and returns the count line the browser shows for it. */
async function followCount(page: Page, name: string): Promise<string> {
  await link(page, name).click();
  await expect(countLine(page)).toHaveText(/^\d+ of \d+ (papers|platforms)$/);
  const text = (await countLine(page).textContent()) ?? "";
  await page.goBack();
  return text;
}

/** Presses Tab until the focused element is a link with this text (and href, when given). */
async function tabToLink(page: Page, text: string, href?: string, max = 400) {
  for (let n = 0; n < max; n++) {
    await page.keyboard.press("Tab");
    const hit = await page.evaluate(
      ([t, h]) => {
        const el = document.activeElement;
        return el instanceof HTMLAnchorElement && el.textContent === t && (!h || el.getAttribute("href") === h);
      },
      [text, href ?? ""] as const,
    );
    if (hit) return;
  }
  throw new Error(`Tab did not reach the link ${text} within ${max} presses`);
}

/** Heading levels of main in document order. */
const headingLevels = (page: Page) =>
  page.locator("main").evaluate((m) => [...m.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((h) => Number(h.tagName[1])));

test("AC-11: navigation, overview caption, sources, relations and class tables", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  const nav = page.getByRole("navigation");
  await expect(nav.getByRole("link")).toHaveText(["SDL Workflows Explorer", "Home", "Browse", "Trends", "Taxonomy"]);
  await nav.getByRole("link", { name: "Taxonomy", exact: true }).click();
  expect(await hash(page)).toBe("#/taxonomy");
  await expect(h1(page, "Taxonomy")).toBeVisible();
  await expect(page.getByText(CAPTION, { exact: true })).toBeVisible();

  const sources = region(page, "Sources of the correspondence");
  await expect(sources.locator("tbody tr")).toHaveCount(5);
  await expect(sources.locator("tbody tr").first().getByRole("link")).toHaveAttribute("href", "https://doi.org/10.1126/science.abc2986");
  const relations = region(page, "Relations").locator("tbody tr");
  await expect(relations.locator("td:first-child")).toHaveText(["exact", "broader", "narrower", "none"]);
  await expect(relations.locator("td:nth-child(2)").nth(0)).toHaveText("—");
  await expect(relations.locator("td:nth-child(2)").nth(3)).toHaveText("—");

  for (const [name, n] of [["Field tags", 10], ["Module types", 22], ["Transfer modes", 6], ["Unit operations", 31]] as const) {
    await expect(region(page, name).locator("tbody tr"), name).toHaveCount(n);
  }
  const flow = region(page, "Module types").locator("tbody tr", { has: link(page, "flow_reactor") });
  await expect(flow).toContainText("139 modules");
  await expect(flow.getByRole("link")).toHaveAttribute("href", "#/taxonomy/module_type/flow_reactor");
  await expect(region(page, "Field tags").locator("tbody tr", { has: link(page, "catalysis") })).toContainText("23 papers");
  const families = region(page, "Unit operations").getByRole("heading", { level: 3 });
  await expect(families).toHaveText([
    "Family: analyze", "Family: form", "Family: handle", "Family: measure", "Family: mix",
    "Family: plan", "Family: prepare", "Family: react", "Family: separate", "Family: unmapped",
  ]);
  await expect(region(page, "Family: mix").locator("tbody tr td:first-child")).toHaveText(["mix", "sonicate"]);
  expect(errors).toEqual([]);
});

test("AC-12: module type, field tag and transfer mode pages with matching count lines", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/#/taxonomy/module_type/flow_reactor");
  await expect(h1(page, "flow_reactor")).toBeVisible();
  await expect(page.locator(".taxo-facts")).toContainText("Module type");
  const counts = region(page, "Counts");
  await expect(counts).toContainText("139 modules");
  expect(await followCount(page, "127 platforms")).toBe("127 of 280 platforms");
  expect(await followCount(page, "99 papers")).toBe("99 of 238 papers");
  const first = region(page, "Example platforms").getByRole("listitem").first();
  await expect(first.getByRole("link")).toHaveText("Bedard2018/P11");
  await expect(first).toContainText("(3 modules)");
  await first.getByRole("link").click();
  expect(await hash(page)).toBe("#/platform/Bedard2018/P11");
  await expect(
    h1(page, "Reconfigurable continuous-flow system, ketene generation and [2+2] cycloaddition configuration"),
  ).toBeVisible();

  await page.goto("/#/taxonomy/field_tag/catalysis");
  await expect(h1(page, "catalysis")).toBeVisible();
  await expect(region(page, "Counts").getByRole("listitem")).toHaveText(["23 platforms", "23 papers"]);
  expect(await followCount(page, "23 platforms")).toBe("23 of 280 platforms");
  expect(await followCount(page, "23 papers")).toBe("23 of 238 papers");
  const examples = region(page, "Example platforms");
  await expect(examples.getByRole("link")).toHaveText(["Amara2015/P1", "Bai2023a/P1", "Baumgartner2019/P1", "Bennett2024/P1", "Brody2026/P1"]);
  const items = await examples.getByRole("listitem").allTextContents();
  expect(items.filter((t) => /\(\d+ (papers?|modules?|connections?|steps?)\)$/.test(t))).toEqual([]);
  await expect(examples).toContainText("The first five platforms with this field tag, in platform id order.");

  await page.goto("/#/taxonomy/transfer_mode/data_transfer");
  await expect(region(page, "Counts")).toContainText("611 connections");
  await expect(link(page, "280 platforms")).toHaveAttribute("href", "#/browse?view=platforms");
  await expect(link(page, "238 papers")).toHaveAttribute("href", "#/browse");
  await expect(region(page, "Counts")).toContainText(
    "data_transfer is not offered by the browser's filters. It is recorded on all 280 platforms, so these links open the full lists.",
  );
  expect(await followCount(page, "280 platforms")).toBe("280 of 280 platforms");
  expect(await followCount(page, "238 papers")).toBe("238 of 238 papers");
  expect(errors).toEqual([]);
});

test("AC-12: unit operation, unused field tag and four-example pages", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/#/taxonomy/unit_operation/sonicate");
  await expect(page.locator(".taxo-facts")).toContainText("Unit operation");
  await expect(page.locator(".taxo-facts")).toContainText("mix");
  await expect(region(page, "Counts")).toContainText("11 steps");
  expect(await followCount(page, "5 platforms")).toBe("5 of 280 platforms");
  expect(await followCount(page, "5 papers")).toBe("5 of 238 papers");
  const first = region(page, "Example platforms").getByRole("listitem").first();
  await expect(first.getByRole("link")).toHaveText("Zhao2026/P1");
  await expect(first).toContainText("(6 steps)");

  await page.goto("/#/taxonomy/field_tag/unmapped");
  await expect(region(page, "Counts").getByRole("listitem")).toHaveText(["0 platforms", "0 papers"]);
  await expect(region(page, "Counts").getByRole("link")).toHaveCount(0);
  await expect(region(page, "Counts")).toContainText("No platform uses this class, so the browser has no filter for it.");
  await expect(region(page, "Example platforms")).toContainText("No platform uses this class.");

  await page.goto("/#/taxonomy/module_type/assembly_unit");
  const items = region(page, "Example platforms").getByRole("listitem");
  await expect(items.getByRole("link")).toHaveText(["Dai2025/P1", "Gao2026/P1", "Toyama2025/P1", "Yik2025/P1"]);
  for (let i = 0; i < 4; i++) await expect(items.nth(i)).toContainText("(1 module)");
  expect(errors).toEqual([]);
});

test("AC-13: correspondence sections", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/#/taxonomy/module_type/thermal_unit");
  const corr = region(page, "Correspondence");
  await expect(corr.getByRole("heading", { level: 3 })).toHaveText(["XDL", "WCSO", "Leong2022", "OntoLab_SAREF", "Gottstein2026"]);
  const xdl = region(page, "XDL");
  await expect(xdl.locator(".taxo-targets li")).toHaveText([
    "Heater/chiller — exact", "Low temperature — exact", "circulation chiller — exact", "heater chiller — exact", "stirrer hotplate — exact",
  ]);
  await expect(xdl.locator(".taxo-sources li")).toHaveText(["Mehr2020 ; p.10 ; Fig. 5", "Mehr2020 ; p.4 ; Fig. 2", "Mehr2020 ; p.11 ; main text"]);
  await expect(xdl.locator(".taxo-ref a")).toHaveAttribute("href", "https://doi.org/10.1126/science.abc2986");
  const saref = region(page, "OntoLab_SAREF");
  await expect(saref).toContainText("No counterpart in this vocabulary.");
  await expect(saref).toContainText("Source searched:");
  await expect(saref.locator(".taxo-sources li")).toHaveText(["Bai2024"]);

  await page.goto("/#/taxonomy/transfer_mode/mobile_robot");
  await expect(region(page, "Leong2022").locator(".taxo-targets li")).toHaveText(["transportation task — broader"]);
  await expect(region(page, "Leong2022").locator(".taxo-sources li")).toHaveText(["Leong2022 ; p.9 ; Limitations"]);
  await expect(region(page, "OntoLab_SAREF")).toContainText("Not covered: OntoLab_SAREF maps module types only.");

  await page.goto("/#/taxonomy/module_type/human");
  await expect(region(page, "Leong2022").locator(".taxo-targets li")).toHaveText(["Manual task — broader", "manual tool — narrower"]);
  await expect(region(page, "Gottstein2026")).toContainText("No counterpart in this vocabulary.");
  await expect(region(page, "Gottstein2026").locator(".taxo-sources li")).toHaveText(["Gottstein2026 ; pdf p.3 ; Fig. 1"]);

  await page.goto("/#/taxonomy/field_tag/catalysis");
  await expect(region(page, "Correspondence")).toContainText("The correspondence table does not map field tags.");
  await expect(region(page, "Correspondence").getByRole("heading", { level: 3 })).toHaveCount(0);
  await page.goto("/#/taxonomy/unit_operation/unmapped");
  await expect(region(page, "Correspondence")).toContainText("The correspondence table has no row for this class.");

  await page.goto("/#/taxonomy/unit_operation/wash_extract");
  const relations = await page.locator(".taxo-targets li").allTextContents();
  expect(relations.length).toBeGreaterThan(0);
  expect(relations.every((t) => / — (exact|broader|narrower)$/.test(t))).toBe(true);
  expect(errors).toEqual([]);
});

test("AC-15: lazy chunk and a single taxonomy.json request", async ({ page }) => {
  const errors = trackErrors(page);
  const requested: string[] = [];
  page.on("request", (r) => requested.push(new URL(r.url()).pathname));
  const chunks = () => requested.filter((p) => /\/assets\/Taxonomy[^/]*\.js$/.test(p));
  const taxonomyJson = () => requested.filter((p) => p.endsWith("/data/taxonomy.json"));

  await page.goto("/#/");
  await expect(page.getByText("Data version 1.0.0")).toBeVisible();
  for (const url of ["/#/browse", "/#/trends", "/#/platform/Aand2024/P1"]) {
    await page.goto(url);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  expect(requested.filter((p) => /\/Taxonomy[^/]*\.js$/.test(p))).toEqual([]);
  expect(taxonomyJson()).toEqual([]);

  await page.getByRole("navigation").getByRole("link", { name: "Taxonomy", exact: true }).click();
  await expect(h1(page, "Taxonomy")).toBeVisible();
  expect(chunks()).toHaveLength(1);
  expect(taxonomyJson()).toHaveLength(1);
  await link(page, "flow_reactor").click();
  await expect(h1(page, "flow_reactor")).toBeVisible();
  await page.getByRole("navigation").getByRole("link", { name: "Taxonomy", exact: true }).click();
  await expect(h1(page, "Taxonomy")).toBeVisible();
  expect(taxonomyJson()).toHaveLength(1);
  expect(errors).toEqual([]);
});

test("AC-15: a taxonomy route requests no platform file", async ({ page }) => {
  const requested: string[] = [];
  page.on("request", (r) => requested.push(new URL(r.url()).pathname));
  await page.goto("/#/taxonomy");
  await expect(h1(page, "Taxonomy")).toBeVisible();
  await page.goto("/#/taxonomy/module_type/flow_reactor");
  await expect(h1(page, "flow_reactor")).toBeVisible();
  expect(requested.filter((p) => p.includes("/data/platforms/"))).toEqual([]);
});

test("AC-15: the taxonomy view shows its own Loading… until taxonomy.json arrives", async ({ page }) => {
  const errors = trackErrors(page);
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    void page.route("**/data/taxonomy.json", async (route) => {
      release = () => void route.continue();
      resolve();
    });
  });
  await page.goto("/#/taxonomy");
  await held;
  await expect(page.getByText("Data version 1.0.0")).toBeVisible();
  await expect(page.locator("main")).toHaveText("Loading…");
  await expect(h1(page, "Taxonomy")).toHaveCount(0);
  release();
  await expect(h1(page, "Taxonomy")).toBeVisible();
  await expect(page.locator("main").getByText("Loading…")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("AC-15: class not found, malformed route and load failure", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/#/taxonomy/module_type/nonexistent");
  await expect(h1(page, "Class not found")).toBeVisible();
  await expect(page.getByText("The taxonomy has no class nonexistent of kind module_type.", { exact: true })).toBeVisible();
  await expect(link(page, "Back to the taxonomy")).toHaveAttribute("href", "#/taxonomy");
  await page.goto("/#/taxonomy/x/flow_reactor");
  await expect(page.getByText("The taxonomy has no class flow_reactor of kind x.", { exact: true })).toBeVisible();
  await page.goto("/#/taxonomy/a/b/c");
  await expect(h1(page, "Not found")).toBeVisible();
  expect(errors).toEqual([]);

  const fresh = await page.context().newPage();
  const freshErrors = trackErrors(fresh);
  await fresh.route("**/data/taxonomy.json", (route) => route.fulfill({ status: 500, body: "" }));
  await fresh.goto("/#/taxonomy");
  await expect(fresh.getByRole("alert")).toHaveText(/^Could not load the taxonomy:/);
  expect(freshErrors).toEqual([]);
});

test("AC-16: no page-level horizontal scroll at 375 px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  for (const [url, title] of [
    ["/#/taxonomy", "Taxonomy"],
    ["/#/taxonomy/module_type/thermal_unit", "thermal_unit"],
    ["/#/taxonomy/unit_operation/sonicate", "sonicate"],
  ] as const) {
    await page.goto(url);
    await expect(h1(page, title)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth), url).toBeLessThanOrEqual(375);
  }
});

test("AC-16: keyboard reaches and opens the taxonomy links", async ({ page }) => {
  await page.goto("/#/taxonomy");
  await expect(h1(page, "Taxonomy")).toBeVisible();
  await tabToLink(page, "Taxonomy", "#/taxonomy");
  await tabToLink(page, "doi:10.1126/science.abc2986");
  await tabToLink(page, "flow_reactor");
  await page.keyboard.press("Enter");
  await expect(h1(page, "flow_reactor")).toBeVisible();
  await tabToLink(page, "127 platforms");
  await tabToLink(page, "Bedard2018/P11");
});

test("AC-16: heading levels start at h1 and never skip", async ({ page }) => {
  for (const url of [
    "/#/taxonomy",
    "/#/taxonomy/module_type/flow_reactor",
    "/#/taxonomy/field_tag/catalysis",
    "/#/taxonomy/transfer_mode/data_transfer",
    "/#/taxonomy/unit_operation/sonicate",
    "/#/taxonomy/field_tag/unmapped",
    "/#/taxonomy/module_type/assembly_unit",
  ]) {
    await page.goto(url);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const levels = await headingLevels(page);
    expect(levels[0], url).toBe(1);
    for (let i = 1; i < levels.length; i++) expect(levels[i]! - levels[i - 1]!, `${url} heading ${i}`).toBeLessThanOrEqual(1);
  }
});
