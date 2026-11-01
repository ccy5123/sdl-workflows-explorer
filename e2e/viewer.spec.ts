// AC-9 to AC-13: the platform viewer in Chromium against the e2e build (SPEC-VIEW-001).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import type { Core } from "cytoscape";
import type { PlatformFile, PlatformGraph } from "../src/data/types";

type Win = Window & { __cy?: Core };

const REF = "#/platform/Aand2024/P1";

async function waitForGraph(page: Page) {
  await page.waitForFunction(() => {
    const cy = (window as Win).__cy;
    return !!cy && cy.nodes(".module").length > 0;
  });
}

const evidence = (page: Page, field: string) => page.locator(`.evidence [data-field="${field}"]`);

async function expectEvidence(page: Page, doc: string, pageNo: string, locator: string) {
  await expect(evidence(page, "doc")).toHaveText(doc);
  await expect(evidence(page, "page")).toHaveText(pageNo);
  await expect(evidence(page, "locator")).toHaveText(locator);
}

async function tabUntil(page: Page, predicate: string, max = 80) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    if (await page.evaluate((sel) => document.activeElement?.matches(sel) ?? false, predicate)) return;
  }
  throw new Error(`Tab did not reach ${predicate} within ${max} presses`);
}

const highlighted = (page: Page) =>
  page.evaluate(() =>
    (window as Win)
      .__cy!.nodes(".highlighted")
      .map((n) => n.id())
      .sort(),
  );
const dimmedCount = (page: Page) => page.evaluate(() => (window as Win).__cy!.nodes(".dimmed").length);

test("AC-9: the viewer opens a platform by URL", async ({ page }) => {
  await page.goto(`/${REF}`);
  await expect(page.locator("h1")).toHaveText("auto-optimization platform (AOP)");
  await expect(page.locator('.platform-header [data-field="year"]')).toHaveText("2024");
  await expect(page.locator('.platform-header a[href="https://doi.org/10.1039/d4re00138a"]')).toBeVisible();
  await waitForGraph(page);
  const counts = await page.evaluate(() => {
    const cy = (window as Win).__cy!;
    return { modules: cy.nodes(".module").length, edges: cy.edges().length };
  });
  expect(counts).toEqual({ modules: 5, edges: 5 });
  await expect(page.locator(".steps .step")).toHaveCount(6);
  expect(await page.locator(".steps .step").evaluateAll((els) => els.map((e) => e.getAttribute("data-step-order")))).toEqual(
    ["1", "2", "3", "4", "5", "6"],
  );
  await expect(page.locator('[data-table="modules"] tbody tr')).toHaveCount(5);
  await expect(page.locator('[data-table="connections"] tbody tr')).toHaveCount(5);
  await expect(evidence(page, "kind")).toHaveText("Platform");
  await expectEvidence(page, "main", "4", "Fig. 1a");
});

test("AC-10: selecting a step by keyboard and by click", async ({ page }) => {
  await page.goto(`/${REF}`);
  await waitForGraph(page);
  await tabUntil(page, '.step[data-step-order="1"]');
  await page.keyboard.press("Enter");
  expect(await highlighted(page)).toEqual(["Aand2024/P1/M3"]);
  expect(await dimmedCount(page)).toBe(4);
  await expect(evidence(page, "kind")).toHaveText("Step");
  await expectEvidence(page, "SI1", "15", "§S2.4 ¶1");

  await page.keyboard.press("Escape");
  expect(await highlighted(page)).toEqual([]);
  expect(await dimmedCount(page)).toBe(0);
  await expect(evidence(page, "kind")).toHaveText("Platform");
  await expectEvidence(page, "main", "4", "Fig. 1a");

  const step1 = page.locator('.step[data-step-order="1"]');
  await step1.click();
  expect(await highlighted(page)).toEqual(["Aand2024/P1/M3"]);
  await step1.click();
  expect(await highlighted(page)).toEqual([]);
  await expect(evidence(page, "kind")).toHaveText("Platform");
});

test("AC-11: selecting table rows with Enter shows their evidence", async ({ page }) => {
  await page.goto(`/${REF}`);
  await waitForGraph(page);
  await page.locator('[data-table="modules"] tbody tr').first().focus();
  await page.keyboard.press("Enter");
  await expect(evidence(page, "kind")).toHaveText("Module");
  await expect(evidence(page, "id")).toHaveText("Aand2024/P1/M1");
  await expectEvidence(page, "SI1", "13", "§2.2.8 ¶1");

  await page.locator('[data-table="connections"] tbody tr').first().focus();
  await page.keyboard.press("Enter");
  await expect(evidence(page, "kind")).toHaveText("Connection");
  await expect(evidence(page, "id")).toHaveText("Aand2024/P1/E1");
  await expectEvidence(page, "SI1", "15", "§S2.4 ¶1");
});

test("AC-12: not-found routes, home list and back navigation", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  for (const hash of ["#/platform/Nope2000/P1", "#/nonsense"]) {
    await page.goto(`/${hash}`);
    const alert = page.getByRole("alert");
    await expect(alert).toContainText("Not found");
    await expect(alert).toContainText(hash);
    await expect(alert.getByRole("link", { name: "Go to the home page" })).toHaveAttribute("href", "#/");
  }

  await page.goto("/");
  await expect(page.locator('[data-table="platforms"] tbody tr')).toHaveCount(280);
  await tabUntil(page, 'input[type="search"]');
  await page.keyboard.type("Aand2024");
  await expect(page.locator('[data-table="platforms"] tbody tr')).toHaveCount(1);
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement?.textContent)).toBe("Aand2024/P1");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/platform\/Aand2024\/P1$/);
  await expect(page.locator("h1")).toHaveText("auto-optimization platform (AOP)");

  await page.goBack();
  await expect(page.getByRole("heading", { name: "Platforms" })).toBeVisible();
  expect(new URL(page.url()).hash).toBe("");
  expect(errors).toEqual([]);
});

function pickMarkedPlatform(): PlatformGraph {
  const dir = join(import.meta.dirname, "..", "public", "data", "platforms");
  for (const file of readdirSync(dir).sort()) {
    const data = JSON.parse(readFileSync(join(dir, file), "utf8")) as PlatformFile;
    for (const p of data.platforms) {
      const off = p.modules.some((m) => !m.on_platform);
      const on = p.modules.some((m) => m.on_platform);
      const inferred = p.connections.some((c) => !c.stated);
      const uncertain = p.connections.some((c) => c.uncertain) || p.steps.some((s) => s.uncertain);
      if (off && on && inferred && uncertain) return p;
    }
  }
  throw new Error("no release platform has an off-platform module, an inferred edge and an uncertain item");
}

test("AC-13: off-platform modules, dashed inferred edges, ? markers and the legend", async ({ page }) => {
  const p = pickMarkedPlatform();
  console.log(`AC-13 platform: ${p.platform_id}`);
  await page.goto(`/#/platform/${p.platform_id}`);
  await waitForGraph(page);

  const parents = await page.evaluate((ids) => {
    const cy = (window as Win).__cy!;
    return ids.map((id) => {
      const parent = cy.getElementById(id).parent();
      return parent.length ? parent.first().id() : null;
    });
  }, p.modules.map((m) => m.module_id));
  p.modules.forEach((m, i) => {
    expect(parents[i], m.module_id).toBe(m.on_platform ? `boundary:${p.platform_id}` : null);
  });

  const inferred = p.connections.find((c) => !c.stated)!;
  expect(await page.evaluate((id) => (window as Win).__cy!.getElementById(id).style("line-style"), inferred.edge_id)).toBe("dashed");

  const uncertainEdge = p.connections.find((c) => c.uncertain);
  if (uncertainEdge) {
    expect(await page.evaluate((id) => String((window as Win).__cy!.getElementById(id).data("label")), uncertainEdge.edge_id)).toContain(
      "?",
    );
  } else {
    const step = p.steps.find((s) => s.uncertain)!;
    await expect(page.locator(`.step[data-step-order="${step.step_order}"]`)).toContainText("?");
  }

  await expect(page.locator('[data-legend="groups"] > li')).toHaveCount(5);
  await expect(page.locator('[data-legend="modes"] > li')).toHaveCount(6);
  await expect(page.locator('[data-legend="note"]')).toContainText("display choice of this site, not part of the dataset");
  await expect(page.locator('[data-legend="markers"]')).toContainText("Dashed edge");
  await expect(page.locator('[data-legend="markers"]')).toContainText("?");
});
