// SPEC-UI-001 phase 6 (UI AC-49): axe-core over every route of e2e/routes.ts and the interactive states the redesign
// added (both platforms, a filled workflow with simulation results, an open filter popover and Columns popover, the
// open site menu, the open evidence sheet and the open legend), in light and dark. Serious and critical violations
// fail the test; every violation is written to AXE_OUT (default screenshots/axe, git-ignored) for the report.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { READY, ROUTES } from "./routes";

const OUT = process.env.AXE_OUT ?? join(import.meta.dirname, "..", "screenshots", "axe");
const THEMES = ["light", "dark"] as const;
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

interface State {
  name: string;
  hash: string;
  width?: number;
  /** Puts the page into the state to check, after it has loaded. */
  act?: (page: Page) => Promise<void>;
}

const main = (page: Page) => page.locator("main");

async function fillFrom(page: Page, platformId: string) {
  const m = main(page);
  await m.getByLabel("Start from a coded platform").selectOption(platformId);
  await m.getByRole("button", { name: "Fill the builder from this platform" }).click();
  await expect(m.locator(".wf-message").first()).toContainText(`Filled from ${platformId}`);
}

const STATES: State[] = [
  ...ROUTES.map((r) => ({ name: r.hash, hash: r.hash })),
  { name: "platform Kim2026/P1", hash: "#/platform/Kim2026/P1" },
  {
    name: "platform Aand2024/P1, evidence sheet and legend open",
    hash: "#/platform/Aand2024/P1",
    act: async (page) => {
      await main(page).locator('[data-table="modules"] tbody tr').first().click();
      await expect(page.locator(".evidence-sheet")).toBeVisible();
      await page.getByRole("button", { name: "Legend" }).click();
      await expect(page.locator('[data-legend="groups"]')).toBeVisible();
    },
  },
  {
    name: "workflow filled from Aand2024/P1, simulation run, events open",
    hash: "#/workflow",
    act: async (page) => {
      await fillFrom(page, "Aand2024/P1");
      await main(page).getByRole("button", { name: "Run simulation" }).click();
      await expect(main(page).locator('[data-result="simulation"]')).toBeVisible();
      await main(page).locator(".wf-events summary").click();
    },
  },
  {
    name: "browse, Field tag popover open",
    hash: "#/browse",
    act: async (page) => {
      const button = page.locator(".filter-panel").getByRole("button", { name: /^Field tag( · \d+)?$/ });
      await button.click();
      await expect(button).toHaveAttribute("aria-expanded", "true");
    },
  },
  {
    name: "browse, Columns popover open",
    hash: "#/browse",
    act: async (page) => {
      await main(page).getByRole("button", { name: /^Columns · \d+$/ }).click();
    },
  },
  {
    name: "site menu open at 375 px",
    hash: "#/",
    width: 375,
    act: async (page) => {
      await page.getByRole("button", { name: "Menu" }).click();
      await expect(page.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "true");
    },
  },
  {
    name: "taxonomy, How this works open",
    hash: "#/taxonomy",
    act: async (page) => {
      await main(page).locator("details.how-it-works > summary").click();
    },
  },
];

interface Found {
  id: string;
  impact: string | null | undefined;
  help: string;
  nodes: string[];
}

mkdirSync(OUT, { recursive: true });

for (const state of STATES) {
  for (const theme of THEMES) {
    test(`UI AC-49: axe on ${state.name} (${theme})`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width: state.width ?? 1280, height: 900 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.goto(`/${state.hash}`);
      await expect(page.locator(READY)).toBeVisible();
      if (state.act) await state.act(page);
      const result = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      const found: Found[] = result.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.slice(0, 5).map((n) => n.target.join(" ")),
      }));
      const file = `${state.name.replace(/[^a-z0-9]+/gi, "_")}_${theme}.json`;
      writeFileSync(join(OUT, file), JSON.stringify({ state: state.name, theme, found }, null, 2));
      const blocking = found.filter((f) => f.impact === "serious" || f.impact === "critical");
      expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
    });
  }
}
