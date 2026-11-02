// SPEC-SITE-001 AC-6, AC-7: the home and about pages in Chromium against the e2e build.
import { expect, test, type Page } from "@playwright/test";
import type { IndexJson, ReleaseDocs } from "../src/data/types";
import { formatCitation } from "../src/lib/citation";
import { PLATFORM_LIST_BUTTON } from "../src/lib/siteText";

const fetchJson = <T>(page: Page, path: string) =>
  page.evaluate((p) => fetch(p).then((r) => r.json()), path) as Promise<T>;

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

const NO_CONCLUSIONS = ["increasingly", "trend toward", "the field is", "shows that", "demonstrates", "growing", "most sdls"];

/** Main-region text outside <details> (the verbatim blocks), lower-cased. */
const ownText = (page: Page) =>
  page.locator("main").evaluate((m) => {
    const copy = m.cloneNode(true) as HTMLElement;
    copy.querySelectorAll("details").forEach((d) => d.remove());
    return copy.innerText;
  });

test("AC-6: home page order, links, citation and platform list", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/#/");
  const docs = await fetchJson<ReleaseDocs>(page, "data/release-docs.json");
  const index = await fetchJson<IndexJson>(page, "data/index.json");
  const main = page.locator("main");

  await expect(main.locator("h1")).toHaveText("SDL Workflows Explorer");
  const intro = main.locator(".home-intro");
  await expect(intro).toContainText(`Release ${index.release.version}`);
  await expect(intro).toContainText("280 platforms");
  await expect(intro).toContainText("238 papers");

  const views = main.locator("table.views tbody tr");
  await expect(views).toHaveCount(5);
  await expect(views.locator("th")).toHaveText(["Platform viewer", "Browse and compare", "Trends", "Taxonomy", "Benchmark"]);
  await expect(views.nth(0).getByRole("button", { name: PLATFORM_LIST_BUTTON })).toHaveCount(1);
  for (const [i, href] of [[1, "#/browse"], [2, "#/trends"], [3, "#/taxonomy"], [4, "#/benchmark"]] as const) {
    await expect(views.nth(i).getByRole("link")).toHaveAttribute("href", href);
  }

  await expect(main.locator("table.counts")).toBeVisible();
  const download = main.getByRole("link", { name: "Download the data", exact: true });
  await expect(download).toHaveAttribute("href", `https://doi.org/${index.release.doi}`);
  await expect(main.locator(".citation")).toHaveText(formatCitation(docs.citation));
  await expect(main).toContainText("CC BY 4.0");
  const cff = main.locator("details.citation-cff");
  await expect(cff).not.toHaveAttribute("open", "");
  expect(await cff.locator("pre").textContent()).toBe(docs.citation_cff);
  await expect(main.locator('[data-table="platforms"] tbody tr')).toHaveCount(280);

  // Document order: intro, views, counts, download, citation, CITATION.cff block, platform list.
  const tops = await Promise.all(
    [intro, main.locator("table.views"), main.locator("table.counts"), download, main.locator(".citation"), cff,
      main.locator('[data-table="platforms"]')].map((l) => l.evaluate((e) => e.getBoundingClientRect().top + window.scrollY)),
  );
  expect([...tops].sort((a, b) => a - b)).toEqual(tops);

  const dataLinks = await main.locator("a").evaluateAll((as) =>
    as.map((a) => a.getAttribute("href") ?? "").filter((h) => h.startsWith("data/") || h.startsWith("./data/")),
  );
  expect(dataLinks).toEqual([]);
  expect(errors).toEqual([]);
});

test("AC-6: the platform-viewer button moves focus to the platform filter", async ({ page }) => {
  await page.goto("/#/");
  const filter = page.getByLabel("Filter by platform id, name or paper id");
  await page.getByRole("button", { name: PLATFORM_LIST_BUTTON }).click();
  await expect(filter).toBeFocused();
  await page.locator("h1").click();
  await page.getByRole("button", { name: PLATFORM_LIST_BUTTON }).focus();
  await page.keyboard.press("Enter");
  await expect(filter).toBeFocused();
});

test("screen check: at 375 px each view's description sits under its name, not in a narrow column", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/#/");
  const row = page.locator("table.views tbody tr").nth(1);
  const [name, text] = await Promise.all([row.locator("th").boundingBox(), row.locator("td").boundingBox()]);
  expect(text!.y).toBeGreaterThanOrEqual(name!.y + name!.height - 1);
  expect(text!.width).toBeGreaterThan(300);
});

test("AC-7: about page summary, limits and full data card", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/#/");
  const nav = page.getByRole("navigation");
  await expect(nav.getByRole("link", { name: "About", exact: true })).toHaveAttribute("href", "#/about");
  await nav.getByRole("link", { name: "About", exact: true }).click();
  const docs = await fetchJson<ReleaseDocs>(page, "data/release-docs.json");
  const index = await fetchJson<IndexJson>(page, "data/index.json");
  const main = page.locator("main");

  await expect(main.locator("h1")).toHaveText("About the data");
  await expect(main.locator("h2")).toContainText([
    "How the papers were found", "How the papers were coded", "How far the labels can be trusted", "Limits",
  ]);
  await expect(main).toContainText(`release ${index.release.version}`);
  const card = main.locator("details.data-card");
  await expect(card).not.toHaveAttribute("open", "");
  expect(await card.locator("pre").textContent()).toBe(docs.data_card);
  await expect(main.getByRole("link", { name: /Zenodo/ }).first()).toHaveAttribute("href", `https://doi.org/${index.release.doi}`);

  const text = await ownText(page);
  for (const phrase of [
    "agreement between two language models", "not accuracy against human coding", "no human coding", "not every",
    "3240 of the 3298", "isolated manual steps", "preprint", "Paper text and abstracts", "notes",
  ]) {
    expect(text, phrase).toContain(phrase);
  }
  expect(errors).toEqual([]);
});

test("AC-7: home and about text draw no conclusion about the field", async ({ page }) => {
  for (const route of ["/#/", "/#/about"]) {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
    const text = (await ownText(page)).toLowerCase();
    for (const phrase of NO_CONCLUSIONS) expect(text, `${route}: ${phrase}`).not.toContain(phrase);
  }
});
