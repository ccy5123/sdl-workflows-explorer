// SPEC-SITE-001 AC-6, AC-7: the home and about pages in Chromium against the e2e build.
import { expect, test, type Page } from "@playwright/test";
import type { IndexJson, ReleaseDocs } from "../src/data/types";
import { formatCitation } from "../src/lib/citation";
import { ABOUT_AUTHOR_LEAD, AUTHOR, PLATFORM_LIST_BUTTON } from "../src/lib/siteText";

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
  await expect(intro).toContainText("279 platforms");
  await expect(intro).toContainText("237 papers");

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
  await expect(main.locator('[data-table="platforms"] tbody tr')).toHaveCount(279);

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
    "3239 were made by a language model", "isolated manual steps", "preprint", "Paper text and abstracts", "notes",
  ]) {
    expect(text, phrase).toContain(phrase);
  }
  expect(errors).toEqual([]);
});

// SPEC-RELEASE-001 AC-4: the About sections of release 1.1.0 and the home intro.
test("release 1.1.0: About sections in order, timing and human-intervention text, home intro", async ({ page }) => {
  await page.goto("/#/about");
  const main = page.locator("main");
  await expect(main.locator("h2")).toHaveText([
    "How the papers were found",
    "How the papers were coded",
    "How far the labels can be trusted",
    "Timing data",
    "Human-intervention reporting",
    "Limits",
    "Full text",
  ]);
  const text = await ownText(page);
  for (const phrase of [
    "454 step durations",
    "228 of the 237 papers have at least one value",
    "0.870 for step duration",
    "agreement between two models, not accuracy",
    "reference values are not released",
    "25 papers state a number",
    "88 state none of these",
    "No second reading exists",
    "free-text qualifiers",
    "the reference values of the timing data are not included",
  ]) {
    expect(text, phrase).toContain(phrase);
  }
  await page.goto("/#/");
  const intro = page.locator(".home-intro");
  await expect(intro).toContainText("batch sizes");
  await expect(intro).toContainText("human intervention");
});

test("AC-7: home and about text draw no conclusion about the field", async ({ page }) => {
  for (const route of ["/#/", "/#/about"]) {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
    const text = (await ownText(page)).toLowerCase();
    for (const phrase of NO_CONCLUSIONS) expect(text, `${route}: ${phrase}`).not.toContain(phrase);
  }
});

// The author's name links to the personal site: in the footer right after the DOI, and on the about page.
test("author link: footer after the DOI on every view, and one line on the about page", async ({ page }) => {
  for (const hash of ["#/", "#/browse", "#/about", "#/platform/Aand2024/P1"]) {
    await page.goto(`/${hash}`);
    const footer = page.locator("footer.site-footer");
    const author = footer.getByRole("link", { name: AUTHOR.name, exact: true });
    await expect(author, hash).toHaveAttribute("href", AUTHOR.url);
    const hrefs = await footer.locator("a").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
    const doi = hrefs.findIndex((h) => h.startsWith("https://doi.org/"));
    expect(hrefs.indexOf(AUTHOR.url), hash).toBe(doi + 1);
  }
  await page.goto("/#/about");
  const line = page.locator("main p", { hasText: ABOUT_AUTHOR_LEAD });
  await expect(line).toHaveText(`${ABOUT_AUTHOR_LEAD} ${AUTHOR.name}.`);
  await expect(line.getByRole("link", { name: AUTHOR.name, exact: true })).toHaveAttribute("href", AUTHOR.url);
});
