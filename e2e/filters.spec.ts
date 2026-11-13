// SPEC-UI-001 phase 4 (REQ-025 to REQ-027): the filter bar of Browse and Trends, the "Split by" segmented control and
// the browser tables (sticky header, row hover, truncated titles, "Show codes").
import { expect, test, type Locator, type Page } from "@playwright/test";

const hash = (page: Page) => page.evaluate(() => window.location.hash);
const bar = (page: Page) => page.locator(".filter-panel");
const popoverButton = (page: Page, legend: string) => bar(page).getByRole("button", { name: new RegExp(`^${legend}( · \\d+)?$`) });
const overflowX = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function insideViewport(page: Page, locator: Locator) {
  const box = (await locator.boundingBox())!;
  const width = page.viewportSize()!.width;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width);
}

test("UI AC-25: Browse shows a filter bar of popover buttons instead of checkbox columns", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#/browse");
  // Four groups show at first (Techniques since SPEC-TECH-001); the other four fold under "More filters".
  for (const legend of ["Field tag", "Module types", "Techniques", "Unit operations"]) {
    await expect(popoverButton(page, legend)).toHaveAttribute("aria-expanded", "false");
  }
  await expect(popoverButton(page, "Integration mode")).toHaveCount(0);
  const more = bar(page).getByRole("button", { name: "More filters · 4", exact: true });
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await more.click();
  for (const legend of ["Integration mode", "Software autonomy", "Hardware autonomy", "Transfer modes"]) {
    await expect(popoverButton(page, legend)).toHaveAttribute("aria-expanded", "false");
  }
  await expect(bar(page).getByRole("button", { name: "Fewer filters", exact: true })).toHaveAttribute("aria-expanded", "true");
  await expect(bar(page).locator('input[type="checkbox"]:visible')).toHaveCount(0);
  await expect(page.getByLabel("Search ids, titles, platform names and instruments")).toBeVisible();
  await expect(page.getByLabel("From", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Clear all" })).toHaveCount(0);
  // The bar is one band above the results.
  const barBox = (await bar(page).boundingBox())!;
  expect(barBox.height).toBeLessThan(140);
  expect(await overflowX(page)).toBe(0);
});

test("UI AC-25: choosing in a popover adds a pill, counts on the button and writes the URL", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#/browse");
  const field = popoverButton(page, "Field tag");
  await field.click();
  await expect(field).toHaveAttribute("aria-expanded", "true");
  const panel = page.locator(`#${await field.getAttribute("aria-controls")}`);
  await expect(panel).toBeVisible();
  await insideViewport(page, panel);
  const catalysis = panel.getByRole("checkbox", { name: "Catalysis (catalysis)", exact: true });
  await expect(catalysis.locator("xpath=..")).toContainText("catalysis");
  await catalysis.check();
  await expect(field).toHaveText("Field tag · 1");
  expect(await hash(page)).toBe("#/browse?field=catalysis");

  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(field).toBeFocused();

  const pill = page.getByRole("button", { name: "Remove Field tag: Catalysis", exact: true });
  await expect(pill.locator("xpath=..")).toContainText("Catalysis");
  await expect(page.getByRole("button", { name: "Clear all" })).toBeVisible();
  await pill.click();
  await expect(field).toHaveText("Field tag");
  expect(await hash(page)).toBe("#/browse");
  await expect(page.getByRole("button", { name: "Clear all" })).toHaveCount(0);
});

test("UI AC-25: one popover at a time; a click outside closes it; Clear all resets every filter", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#/browse?view=platforms&years=2018-2024&field=catalysis&mt=flow_reactor&q=flow");
  await expect(page.locator(".filter-pills .pill")).toHaveCount(4);
  await expect(popoverButton(page, "Module types")).toHaveText("Module types · 1");

  await popoverButton(page, "Module types").click();
  await expect(page.getByRole("group", { name: "Module types match" }).getByRole("radio", { name: "all", exact: true })).toBeChecked();
  await bar(page).getByRole("button", { name: /^More filters/ }).click();
  await popoverButton(page, "Transfer modes").click();
  await expect(popoverButton(page, "Module types")).toHaveAttribute("aria-expanded", "false");
  await expect(popoverButton(page, "Transfer modes")).toHaveAttribute("aria-expanded", "true");
  await page.locator("h1").click();
  await expect(popoverButton(page, "Transfer modes")).toHaveAttribute("aria-expanded", "false");

  await page.getByRole("button", { name: "Clear all" }).click();
  expect(await hash(page)).toBe("#/browse?view=platforms");
  await expect(page.locator(".filter-pills .pill")).toHaveCount(0);
  await expect(page.getByLabel("From", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Search ids, titles, platform names and instruments")).toHaveValue("");
});

test("UI AC-25: at 375 px the filters fold into a tray that rises from the bottom, without sideways scroll", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/#/browse");
  expect(await overflowX(page)).toBe(0);
  await expect(popoverButton(page, "Field tag")).toHaveCount(0);
  const open = bar(page).getByRole("button", { name: "Filters", exact: true });
  await open.click();
  const sheet = page.getByRole("dialog", { name: "Filters" });
  await expect(sheet).toBeVisible();
  await insideViewport(page, sheet);
  const box = (await sheet.boundingBox())!;
  expect(Math.round(box.y + box.height)).toBe(812);
  await expect(sheet.getByRole("button", { name: "Close filters" })).toBeFocused();
  for (const legend of ["Field tag", "Unit operations", "Transfer modes"]) {
    const row = sheet.getByRole("button", { name: new RegExp(`^${legend}`) });
    await row.click();
    await expect(row).toHaveAttribute("aria-expanded", "true");
    const panel = page.locator(`#${await row.getAttribute("aria-controls")}`);
    await expect(panel.getByRole("checkbox").first()).toBeVisible();
    await insideViewport(page, panel);
    expect(await overflowX(page)).toBe(0);
  }
  // Choosing applies at once; the button at the foot names the result and closes the tray.
  await sheet.getByRole("button", { name: /^Field tag/ }).click();
  await sheet.getByRole("checkbox", { name: "Catalysis (catalysis)", exact: true }).check();
  expect(await hash(page)).toBe("#/browse?field=catalysis");
  await expect(sheet.getByRole("button", { name: /^Field tag · 1/ })).toBeVisible();
  await sheet.getByRole("button", { name: /^Show \d+ papers$/ }).click();
  await expect(sheet).toHaveCount(0);
  await expect(bar(page).getByRole("button", { name: /^Filters/ })).toBeFocused();
  await expect(bar(page).getByRole("button", { name: /^Filters/ })).toContainText("1");
  await expect(page.getByRole("button", { name: "Remove Field tag: Catalysis", exact: true })).toBeVisible();
  // Escape closes it too.
  await bar(page).getByRole("button", { name: /^Filters/ }).click();
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
});

test("UI AC-25: Trends uses the same filter bar and keeps it in its URL", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#/trends");
  await popoverButton(page, "Field tag").click();
  await page.getByRole("checkbox", { name: "Catalysis (catalysis)", exact: true }).check();
  expect(await hash(page)).toBe("#/trends?field=catalysis");
  await expect(page.getByRole("button", { name: "Remove Field tag: Catalysis", exact: true })).toBeVisible();
});

test("UI AC-26: Trends Split by is a segmented control of radios", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#/trends");
  const group = page.getByRole("group", { name: "Split by", exact: true });
  const radios = group.getByRole("radio");
  await expect(radios).toHaveCount(6);
  const segments = group.locator("label");
  const ys = await segments.evaluateAll((ls) => ls.map((l) => Math.round(l.getBoundingClientRect().top)));
  expect(new Set(ys).size).toBe(1);
  await expect(group).toHaveCSS("display", /flex/);
  await segments.nth(1).click();
  await expect(radios.nth(1)).toBeChecked();
  await expect(segments.nth(1)).toHaveClass(/checked/);
  await page.keyboard.press("ArrowRight");
  await expect(radios.nth(2)).toBeChecked();
  await expect(radios.nth(2)).toBeFocused();
});

test("UI AC-27: browser tables keep their header in view, highlight the row under the pointer and truncate titles", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#/browse");
  const scroller = page.locator(".browse .table-scroll").first();
  const head = page.locator('.browse [data-table="papers"] thead th').first();
  await scroller.evaluate((el) => el.scrollBy(0, 600));
  const [s, h] = [(await scroller.boundingBox())!, (await head.boundingBox())!];
  expect(Math.abs(h.y - s.y)).toBeLessThanOrEqual(1);

  const row = page.locator('.browse [data-table="papers"] tbody tr').nth(20);
  const before = await row.evaluate((el) => getComputedStyle(el).backgroundColor);
  await row.hover();
  await expect.poll(() => row.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(before);

  const titles = page.locator('.browse [data-table="papers"] tbody .truncate');
  const cut = await titles.evaluateAll((els) =>
    els.filter((e) => e.scrollWidth > e.clientWidth).map((e) => ({ text: e.textContent, title: e.getAttribute("title") })),
  );
  expect(cut.length).toBeGreaterThan(0);
  for (const c of cut) expect(c.title).toBe(c.text);
});

test("UI AC-27: Show codes switches coded cells from names to codes", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#/browse?view=platforms&q=Aand2024");
  const fieldCell = async () => {
    const headers = await page.locator('.browse [data-table="platforms"] thead th').allInnerTexts();
    const i = headers.findIndex((t) => t.trim() === "Field tags");
    return page.locator('.browse [data-table="platforms"] tbody tr').first().locator("td").nth(i);
  };
  const toggle = page.getByRole("button", { name: "Show codes", exact: true });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(await fieldCell()).toContainText("Chemistry synthesis");
  await expect((await fieldCell()).locator("[title=chemistry_synthesis]")).toHaveCount(1);
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(await fieldCell()).toHaveText("chemistry_synthesis");
});

// Phase 4 leftovers (REQ-028): readable Trends labels, a Columns popover, options that are never clipped.
for (const width of [1440, 375]) {
  test(`UI AC-28: at ${width} px each popover option shows its name and its whole code once`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/#/browse");
    // On a phone the groups are rows of the filter tray instead of popovers.
    const phone = width < 800;
    if (phone) await bar(page).getByRole("button", { name: "Filters", exact: true }).click();
    const opener = (legend: string) =>
      phone ? page.getByRole("dialog", { name: "Filters" }).getByRole("button", { name: new RegExp(`^${legend}`) }) : popoverButton(page, legend);
    for (const legend of ["Field tag", "Module types", "Unit operations"]) {
      const button = opener(legend);
      await button.click();
      const panel = page.locator(`#${await button.getAttribute("aria-controls")}`);
      await insideViewport(page, panel);
      const bad = await panel.locator(".filter-option").evaluateAll((labels) => {
        const p = labels[0]!.closest(".filter-popover-panel, .tray-options")!.getBoundingClientRect();
        return labels
          .map((l) => {
            const code = l.querySelector("code")!;
            const r = code.getBoundingClientRect();
            const text = l.textContent!.trim();
            const name = l.querySelector(".filter-option-name")!.textContent;
            const once = l.querySelectorAll("code").length === 1 && text === `${name} ${code.textContent}`;
            return code.scrollWidth > code.clientWidth + 1 || r.right > p.right + 0.5 || !once ? text : null;
          })
          .filter(Boolean);
      });
      expect(bad, legend).toEqual([]);
      if (phone) await button.click();
      else await page.keyboard.press("Escape");
    }
    await opener("Field tag").click();
    await expect(page.getByRole("checkbox", { name: "Battery and electrochemistry (battery_electrochem)", exact: true })).toHaveCount(1);
  });
}

test("UI AC-28: the column chooser is a Columns popover beside Show codes", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#/browse");
  const columns = page.getByRole("button", { name: /^Columns · \d+$/ });
  await expect(columns).toHaveText("Columns · 9");
  await expect(columns).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("group", { name: "Paper table columns" })).toHaveCount(0);
  const [c, s] = [(await columns.boundingBox())!, (await page.getByRole("button", { name: "Show codes" }).boundingBox())!];
  expect(Math.abs(c.y - s.y)).toBeLessThanOrEqual(2);
  await columns.click();
  const panel = page.locator(`#${await columns.getAttribute("aria-controls")}`);
  await insideViewport(page, panel);
  await panel.getByRole("checkbox", { name: "Venue", exact: true }).uncheck();
  await expect(columns).toHaveText("Columns · 8");
  await page.keyboard.press("Escape");
  await expect(columns).toBeFocused();
  await expect(page.locator('.browse [data-table="papers"] thead th', { hasText: /^Venue$/ })).toHaveCount(0);
});

test("UI AC-28: Trends rows and legend show readable names with the code in their title", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#/trends?split=field");
  const th = page.locator("table.count-table tbody tr").nth(1).locator("th");
  await expect(th.locator("[title]")).toHaveAttribute("title", /^[a-z_]+$/);
  expect(await th.innerText()).not.toContain("_");
  await page.goto("/#/trends");
  const first = page.locator(".trends-legend li").first();
  await expect(first).toHaveText("Fixed tubing");
  await expect(first.locator("[title]")).toHaveAttribute("title", "fixed_tubing");
});
