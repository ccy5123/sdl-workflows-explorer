// SPEC-SITE-001 AC-9, AC-10, AC-12, AC-13: skip link, current view and title; visible focus without a trap; no
// horizontal scroll at 375 px; no mid-word breaks in tables. Chromium against the e2e build.
import { expect, test, type Page } from "@playwright/test";
import { READY, ROUTES, SITE_NAME } from "./routes";

const THEMES = ["light", "dark"] as const;

async function open(page: Page, hash: string, theme: (typeof THEMES)[number] = "light") {
  await page.emulateMedia({ colorScheme: theme });
  await page.goto(`/${hash}`);
  await expect(page.locator(READY)).toBeVisible();
}

for (const route of ROUTES) {
  test(`AC-9: skip link, current nav link and title on ${route.hash}`, async ({ page }) => {
    await open(page, route.hash);
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content", exact: true });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();

    const current = page.locator('nav [aria-current="page"]');
    if (route.current) {
      await expect(current).toHaveCount(1);
      await expect(current).toHaveText(route.current);
    } else {
      await expect(current).toHaveCount(0);
    }
    await expect(page).toHaveTitle(`${route.title} · ${SITE_NAME}`);
  });
}

/** Installs a focusin recorder that reads each focused element's outline at the moment it receives focus. */
const recordFocus = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __focus: { what: string; style: string; width: number }[] };
    w.__focus = [];
    document.addEventListener("focusin", (e) => {
      const el = e.target as HTMLElement;
      const s = getComputedStyle(el);
      w.__focus.push({
        what: `${el.tagName.toLowerCase()}${el.className ? `.${String(el.className).split(" ").join(".")}` : ""} "${(el.textContent ?? "").trim().slice(0, 40)}"`,
        style: s.outlineStyle,
        width: parseFloat(s.outlineWidth),
      });
    });
  });

const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

for (const route of ROUTES) {
  for (const theme of THEMES) {
    test(`AC-10: visible focus and no trap on ${route.hash} (${theme})`, async ({ page }) => {
      test.setTimeout(240_000);
      await open(page, route.hash, theme);
      await recordFocus(page);
      const n = await page.locator(TABBABLE).count();
      const last = page.locator("footer.site-footer a").last();
      let reached = false;
      for (let i = 0; i < n + 5; i++) {
        await page.keyboard.press("Tab");
        if (await last.evaluate((el) => el === document.activeElement)) {
          reached = true;
          break;
        }
      }
      expect(reached, `footer's last link not reached within ${n + 5} presses`).toBe(true);
      const focus = await page.evaluate(
        () => (window as unknown as { __focus: { what: string; style: string; width: number }[] }).__focus,
      );
      const bad = focus.find((f) => f.style === "none" || f.width < 2);
      expect(bad, bad ? `no visible focus outline on ${bad.what} (${bad.style} ${bad.width}px)` : "").toBeUndefined();
    });
  }
}

for (const route of ROUTES) {
  for (const theme of THEMES) {
    test(`AC-12: no horizontal scroll at 375 px on ${route.hash} (${theme})`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await open(page, route.hash, theme);
      const { scroll, client } = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(scroll, `${route.hash} scrollWidth ${scroll} > clientWidth ${client}`).toBeLessThanOrEqual(client);
    });
  }
}

const TABLE_ROUTES = [
  "#/",
  "#/browse",
  "#/compare/Aand2024/P1,Li2020/P1",
  "#/taxonomy",
  "#/taxonomy/module_type/flow_reactor",
  "#/benchmark",
];

/** Words of visible table cells whose client rects span more than one line, and number cells without class num. */
const tableProblems = (page: Page) =>
  page.evaluate(() => {
    const broken: string[] = [];
    const unclassed: string[] = [];
    for (const cell of document.querySelectorAll<HTMLElement>("main table th, main table td")) {
      if (cell.getClientRects().length === 0) continue;
      if (cell.tagName === "TD" && /^[\d.,]+$/.test((cell.textContent ?? "").trim()) && !cell.classList.contains("num")) {
        unclassed.push((cell.textContent ?? "").trim());
      }
      const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node as Text;
        // A word is a run of non-space characters up to and including a hyphen: a line break after a hyphen
        // ("self-|optimizing") is a normal break opportunity, not a break inside a word.
        for (const m of text.data.matchAll(/[^\s-]+-?/g)) {
          const range = document.createRange();
          range.setStart(text, m.index!);
          range.setEnd(text, m.index! + m[0].length);
          const tops = new Set([...range.getClientRects()].map((r) => Math.round(r.top)));
          if (tops.size > 1) broken.push(m[0]);
        }
      }
    }
    return { broken, unclassed: [...new Set(unclassed)].slice(0, 10) };
  });

for (const width of [1280, 1024, 820, 801, 800]) {
  test(`AC-13: no mid-word breaks in tables at ${width} px`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 900 });
    for (const hash of TABLE_ROUTES) {
      await open(page, hash);
      await expect(page.locator("main table").first()).toBeVisible();
      const { broken, unclassed } = await tableProblems(page);
      expect(broken, `${hash} at ${width} px: words broken mid-word`).toEqual([]);
      expect(unclassed, `${hash} at ${width} px: number cells without class num`).toEqual([]);
    }
  });
}

test("AC-13: the class page's Relation header and values are whole words", async ({ page }) => {
  for (const width of [820, 801]) {
    await page.setViewportSize({ width, height: 900 });
    await open(page, "#/taxonomy/module_type/flow_reactor");
    const { broken } = await tableProblems(page);
    expect(broken.filter((w) => w === "Relation" || w === "narrower"), `${width} px`).toEqual([]);
    await expect(page.locator("main table th", { hasText: "Relation" })).toBeVisible();
  }
});
