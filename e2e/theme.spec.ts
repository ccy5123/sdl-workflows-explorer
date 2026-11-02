// SPEC-SITE-001 AC-8: the dark theme follows prefers-color-scheme on every route, and changes without a reload.
import { expect, test, type Page } from "@playwright/test";
import { CHART_TOKENS } from "../src/lib/chartTokens";
import { SITE_TOKENS } from "../src/lib/siteTokens";
import { READY, ROUTES } from "./routes";

const rgb = (hex: string) =>
  `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;

const bodyColours = (page: Page) =>
  page.evaluate(() => {
    const s = getComputedStyle(document.body);
    return { background: s.backgroundColor, color: s.color, theme: document.documentElement.dataset.theme };
  });

/** Label colour of the first module node, as Cytoscape reports it. */
const nodeLabelColour = (page: Page) =>
  page.evaluate(() => {
    const cy = (window as unknown as { __cy?: { nodes: (s: string) => { first: () => { style: (p: string) => string } } } }).__cy;
    // Cytoscape writes "rgb(r,g,b)" without spaces; normalise to the computed-style form.
    return cy ? cy.nodes(".module").first().style("color").replace(/,\s*/g, ", ") : null;
  });

for (const route of ROUTES) {
  test(`AC-8: dark theme on ${route.hash}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(`/${route.hash}`);
    await expect(page.locator(READY)).toBeVisible();
    expect(await bodyColours(page)).toEqual({
      background: rgb(SITE_TOKENS.dark["--bg"]),
      color: rgb(SITE_TOKENS.dark["--text"]),
      theme: "dark",
    });
  });
}

test("AC-8: graph labels and chart surface use the dark tokens", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/#/platform/Aand2024/P1");
  await expect.poll(() => nodeLabelColour(page)).toBe(rgb(SITE_TOKENS.dark["--text"]));
  await page.goto("/#/trends");
  await expect(page.locator(READY)).toBeVisible();
  const surface = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--chart-surface").trim(),
  );
  expect(surface).toBe(CHART_TOKENS.dark["--chart-surface"]);
});

test("AC-8: switching the system scheme on an open page follows without a reload", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/#/platform/Aand2024/P1");
  await expect.poll(() => nodeLabelColour(page)).toBe(rgb(SITE_TOKENS.light["--text"]));
  await page.evaluate(() => ((window as unknown as { __marker: boolean }).__marker = true));

  await page.emulateMedia({ colorScheme: "dark" });
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
  await expect.poll(() => nodeLabelColour(page)).toBe(rgb(SITE_TOKENS.dark["--text"]));

  await page.emulateMedia({ colorScheme: "light" });
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe("light");
  await expect.poll(() => nodeLabelColour(page)).toBe(rgb(SITE_TOKENS.light["--text"]));
  expect(await page.evaluate(() => (window as unknown as { __marker?: boolean }).__marker)).toBe(true);
});
