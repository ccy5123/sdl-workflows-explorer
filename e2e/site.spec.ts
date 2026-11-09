// SPEC-SITE-001 AC-6, AC-7 and SPEC-UI-001 AC-8 to AC-10: the home and about pages in Chromium against the e2e build.
import { expect, test, type Page } from "@playwright/test";
import type { IndexJson, ReleaseDocs, TaxonomyJson } from "../src/data/types";
import { formatCitation } from "../src/lib/citation";
import { FEATURED_PLATFORM, SEARCH_EXAMPLES } from "../src/lib/home";
import { ABOUT_AUTHOR_LEAD, AUTHOR, PREPRINT, VIEWS, heroLead, heroTitle, searchPlaceholder } from "../src/lib/siteText";

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

// SPEC-UI-001 AC-8 replaces SPEC-SITE-001 AC-6's home order: the redesigned Home, in document order.
test("AC-8: home order, links, citation and featured platform", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/#/");
  const docs = await fetchJson<ReleaseDocs>(page, "data/release-docs.json");
  const index = await fetchJson<IndexJson>(page, "data/index.json");
  const taxonomy = await fetchJson<TaxonomyJson>(page, "data/taxonomy.json");
  const main = page.locator("main");

  await expect(main.locator("h1")).toHaveText(heroTitle(index.counts.platforms));
  await expect(main.locator(".hero-lead")).toHaveText(heroLead(index.counts.papers));
  await expect(main.locator(".hero-chips")).toContainText(`Release ${index.release.version}`);
  await expect(main.locator(".hero-chips")).toContainText("CC BY 4.0");
  const search = main.getByRole("searchbox", { name: "Search platforms by name, paper or id" });
  await expect(search).toHaveAttribute("placeholder", searchPlaceholder(index.counts.platforms));
  await expect(main.getByRole("link", { name: "Explore platforms" })).toHaveAttribute("href", "#/browse?view=platforms");
  const download = main.getByRole("link", { name: "Download data", exact: true });
  await expect(download).toHaveAttribute("href", `https://doi.org/${index.release.doi}`);

  const featured = main.locator(".featured");
  await expect(featured).toContainText("Featured platform");
  await expect(featured).toContainText(FEATURED_PLATFORM);
  await expect(featured.locator(".fp-step")).toHaveText([
    /^1Dispense liquid/, /^2Photo\/electro reaction/, /^3Optical measurement/, /^4Handle sample/, /^5Analyze data/,
    /^6Plan next experiment/,
  ]);
  await expect(featured.locator(".fp-step").first().locator("[title]")).toHaveAttribute("title", "dispense_liquid");
  await expect(featured.getByRole("link", { name: "Open in viewer" })).toHaveAttribute("href", `#/platform/${FEATURED_PLATFORM}`);

  const tiles = main.locator(".stat-tile");
  await expect(tiles).toHaveCount(6);
  await expect(tiles.locator(".stat-value")).toHaveText([
    index.counts.papers, index.counts.platforms, index.counts.modules, index.counts.steps, index.counts.connections,
      taxonomy.classes.length,
  ].map((n) => n.toLocaleString("en")));

  const cards = main.locator(".view-card");
  await expect(cards).toHaveCount(6);
  await expect(cards.locator(".view-card-name")).toHaveText(VIEWS.map((v) => v.name));
  for (const [i, href] of [`#/platform/${FEATURED_PLATFORM}`, "#/browse", "#/trends", "#/taxonomy", "#/benchmark", "#/workflow"].entries()) {
    await expect(cards.nth(i).locator("a.view-card-link")).toHaveAttribute("href", href);
  }
  await expect(main.getByRole("link", { name: "Trends", exact: true })).toHaveAccessibleDescription(VIEWS[2]!.description);

  await expect(main.locator('[data-list="platforms"] > li')).toHaveCount(20);
  await expect(main.locator(".citation")).toHaveText([formatCitation(docs.citation), PREPRINT.citation]);
  await expect(main.locator(".home-card-chips")).toHaveText(/Data CC BY 4\.0\s*Code MIT/);
  const cff = main.locator("details.citation-cff");
  await expect(cff).not.toHaveAttribute("open", "");
  expect(await cff.locator("pre").textContent()).toBe(docs.citation_cff);
  await expect(main.getByRole("link", { name: "Read the data card" })).toHaveAttribute("href", "#/about");

  // Document order: hero heading, search, buttons, featured card, stat tiles, view cards, list, citation, sample card.
  const tops = await Promise.all(
    [main.locator("h1"), search, download, featured, tiles.first(), cards.first(), main.locator('[data-list="platforms"]'),
      main.locator("#cite-title")].map((l) => l.evaluate((e) => e.getBoundingClientRect().top + window.scrollY)),
  );
  // The sample card sits beside the citation card at this width, after it in reading order.
  const [cite, sample] = await Promise.all(["#cite-title", "#sample-title"].map((s) => main.locator(s).boundingBox()));
  expect(sample!.x).toBeGreaterThan(cite!.x);
  expect(Math.abs(sample!.y - cite!.y)).toBeLessThan(40);
  // The featured card sits beside the hero text at this width, so it is compared with what follows it only.
  expect(tops.slice(0, 3)).toEqual([...tops.slice(0, 3)].sort((a, b) => a - b));
  expect(tops.slice(3)).toEqual([...tops.slice(3)].sort((a, b) => a - b));

  const dataLinks = await main.locator("a").evaluateAll((as) =>
    as.map((a) => a.getAttribute("href") ?? "").filter((h) => h.startsWith("data/") || h.startsWith("./data/")),
  );
  expect(dataLinks).toEqual([]);
  expect(errors).toEqual([]);
});

test("AC-9: hero search suggests platforms, Enter opens the first, and the list takes the query", async ({ page }) => {
  await page.goto("/#/");
  const main = page.locator("main");
  await expect(main.locator("h1")).toBeVisible();
  await page.locator("h1").click();
  await page.keyboard.press("/");
  const search = main.getByRole("searchbox", { name: "Search platforms by name, paper or id" });
  await expect(search).toBeFocused();
  await page.keyboard.type("Aand2024");
  await expect(main.locator(".search-count")).toHaveText("1 of 279 platforms match");
  await expect(main.locator(".search-suggestions a")).toHaveAttribute("href", "#/platform/Aand2024/P1");

  await main.getByRole("button", { name: "Show the match in the list" }).click();
  const filter = main.getByRole("searchbox", { name: "Filter platforms by name, paper or id" });
  await expect(filter).toBeFocused();
  await expect(filter).toHaveValue("Aand2024");
  await expect(main.locator('[data-list="platforms"] > li')).toHaveCount(1);

  await search.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/platform\/Aand2024\/P1$/);
});

test("AC-9: the try chips fill the search; the list shows 20 rows, then all", async ({ page }) => {
  await page.goto("/#/");
  const main = page.locator("main");
  for (const q of SEARCH_EXAMPLES) {
    await main.locator(".search-examples").getByRole("button", { name: q, exact: true }).click();
    await expect(main.getByRole("searchbox", { name: "Search platforms by name, paper or id" })).toHaveValue(q);
    await expect(main.locator(".search-suggestions a").first()).toBeVisible();
  }
  const rows = main.locator('[data-list="platforms"] > li');
  await expect(rows).toHaveCount(20);
  await main.getByRole("button", { name: "Show all 279 platforms" }).click();
  await expect(rows).toHaveCount(279);
  await expect(main.locator(".platform-row-year").first()).toHaveText("2026");
});

test("AC-10: the citation copy button writes the citation to the clipboard", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/#/");
  const docs = await fetchJson<ReleaseDocs>(page, "data/release-docs.json");
  // Located by class: the button's name changes to "Copied" and back after two seconds.
  const button = page.locator(".copy-button").first();
  await expect(button).toHaveText("Copy citation");
  await button.click();
  await expect(button).toHaveText("Copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(formatCitation(docs.citation));
  const paper = page.locator(".copy-button").nth(1);
  await expect(paper).toHaveText("Copy paper citation");
  await paper.click();
  await expect(paper).toHaveText("Copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(PREPRINT.citation);
});

test("screen check: at 375 px the hero stacks above the featured card and the cards fit the screen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/#/");
  await expect(page.locator(".fp-step").first()).toBeVisible();
  const [lead, featured, card] = await Promise.all(
    [".hero-actions", ".featured", ".view-card"].map((s) => page.locator(s).first().boundingBox()),
  );
  expect(featured!.y).toBeGreaterThan(lead!.y + lead!.height - 1);
  for (const box of [featured!, card!]) {
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(375);
  }
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
    "Workflow builder",
    "Visitor count", // SPEC-VISIT-001 REQ-009
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
  const sample = page.locator("main .home-card", { hasText: "About the sample" });
  await expect(sample).toContainText("batch sizes");
  await expect(sample).toContainText("human intervention");
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

// The ChemRxiv preprint: a footer link after the author, a line on the about page, and its citation on the home page.
test("preprint: footer link, about line and home citation", async ({ page }) => {
  const url = `https://doi.org/${PREPRINT.doi}`;
  await page.goto("/#/about");
  const footer = page.locator("footer.site-footer");
  await expect(footer.getByRole("link", { name: PREPRINT.linkText, exact: true })).toHaveAttribute("href", url);
  const hrefs = await footer.locator("a").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
  expect(hrefs.indexOf(url)).toBe(hrefs.indexOf(AUTHOR.url) + 1);
  const line = page.locator("main p", { hasText: PREPRINT.aboutLead });
  await expect(line.getByRole("link", { name: "the preprint on ChemRxiv" })).toHaveAttribute("href", url);
  await page.goto("/#/");
  await expect(page.locator(".citation", { hasText: PREPRINT.citation })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy paper citation" })).toBeVisible();
});
