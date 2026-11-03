// SPEC-CONTRIB-001 AC-4 to AC-8: links to the dataset's GitHub issue forms in Chromium against the e2e build.
import { expect, test, type Locator, type Page } from "@playwright/test";
import type { IndexJson } from "../src/data/types";
import {
  CORRECTION_LINK_TEXT,
  PAPER_LINK_TEXT,
  TAXONOMY_LINK_TEXT,
  correctionUrl,
  paperUrl,
  taxonomyUrl,
} from "../src/lib/contribute";

const REF = "#/platform/Aand2024/P1";
const CLASS = "#/taxonomy/module_type/flow_reactor";

/** The data version the site itself loaded. */
const version = (page: Page) =>
  page.evaluate(() =>
    fetch("data/index.json")
      .then((r) => r.json() as Promise<IndexJson>)
      .then((index) => index.release.version),
  );

const links = (scope: Locator, name: string) => scope.getByRole("link", { name, exact: true });
const evidence = (page: Page) => page.locator(".evidence");
const evidenceId = (page: Page) => page.locator('.evidence [data-field="id"]');

async function expectIssueLink(link: Locator, href: string) {
  await expect(link).toHaveCount(1);
  await expect(link).toHaveAttribute("href", href);
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener");
}

test("AC-4: the platform header links to the correction form for the platform", async ({ page }) => {
  await page.goto(`/${REF}`);
  await expectIssueLink(links(page.locator(".platform-header"), CORRECTION_LINK_TEXT), correctionUrl("Aand2024/P1", await version(page)));
});

test("AC-5: the evidence panel links to the correction form for the selected item only", async ({ page }) => {
  await page.goto(`/${REF}`);
  const release = await version(page);
  const link = links(evidence(page), CORRECTION_LINK_TEXT);
  // Nothing is selected at first: no evidence sheet (SPEC-UI-001 REQ-019).
  await expect(evidence(page)).toHaveCount(0);

  await page.getByRole("button", { name: "Show platform evidence" }).click();
  await expect(evidenceId(page)).toHaveText("Aand2024/P1");
  await expect(link).toHaveCount(0);

  await page.locator('[data-table="modules"] tbody tr', { has: page.locator("code", { hasText: /^Aand2024\/P1\/M1$/ }) }).click();
  await expect(evidenceId(page)).toHaveText("Aand2024/P1/M1");
  await expectIssueLink(link, correctionUrl("Aand2024/P1/M1", release));

  await page.locator('.steps .step[data-step-order="1"]').click();
  await expect(evidenceId(page)).toHaveText("Aand2024/P1/S1");
  await expectIssueLink(link, correctionUrl("Aand2024/P1/S1", release));

  await page.locator('[data-table="connections"] tbody tr').first().click();
  await expect(evidenceId(page)).toHaveText("Aand2024/P1/E1");
  await expectIssueLink(link, correctionUrl("Aand2024/P1/E1", release));

  await page.keyboard.press("Escape");
  await expect(evidence(page)).toHaveCount(0);
});

test("AC-6: a taxonomy class page links to the taxonomy form; the not-found page does not", async ({ page }) => {
  await page.goto(`/${CLASS}`);
  await expect(page.getByRole("heading", { level: 1, name: "Flow reactor", exact: true })).toBeVisible();
  await expectIssueLink(links(page.locator("main"), TAXONOMY_LINK_TEXT), taxonomyUrl("module_type", "flow_reactor"));

  await page.goto("/#/taxonomy/module_type/no_such_class");
  await expect(page.locator("main h1")).toBeVisible();
  await expect(links(page.locator("main"), TAXONOMY_LINK_TEXT)).toHaveCount(0);
});

test("AC-7: the footer links to the missing-paper form after the DOI on every view", async ({ page }) => {
  for (const hash of ["#/", "#/browse", REF]) {
    await page.goto(`/${hash}`);
    const footer = page.locator(".site-footer");
    await expectIssueLink(links(footer, PAPER_LINK_TEXT), paperUrl());
    const hrefs = await footer.locator("a").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
    const doi = hrefs.findIndex((h) => h.startsWith("https://doi.org/"));
    expect(doi, hash).toBeGreaterThanOrEqual(0);
    expect(hrefs.indexOf(paperUrl()), hash).toBeGreaterThan(doi);
  }
});

test("AC-8: no horizontal scroll at 375 px with the new links shown", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const noScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

  await page.goto(`/${REF}`);
  await page.locator('[data-table="modules"] tbody tr').first().click();
  await expect(links(page.locator(".platform-header"), CORRECTION_LINK_TEXT)).toBeVisible();
  await expect(links(evidence(page), CORRECTION_LINK_TEXT)).toBeVisible();
  await expect(links(page.locator(".site-footer"), PAPER_LINK_TEXT)).toBeVisible();
  expect(await noScroll()).toBe(true);

  await page.goto(`/${CLASS}`);
  await expect(links(page.locator("main"), TAXONOMY_LINK_TEXT)).toBeVisible();
  expect(await noScroll()).toBe(true);
});
