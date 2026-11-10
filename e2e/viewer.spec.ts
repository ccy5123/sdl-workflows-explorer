// AC-9 to AC-13: the platform viewer in Chromium against the e2e build (SPEC-VIEW-001).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import type { Core, EdgeSingular, NodeSingular } from "cytoscape";
import type { PlatformFile, PlatformGraph } from "../src/data/types";

type Win = Window & { __cy?: Core };

// The force layout animates for several seconds before it rests, longer while other tests share the machine.
test.describe.configure({ timeout: 120_000 });

const REF = "#/platform/Aand2024/P1";

async function waitForGraph(page: Page) {
  // The force layout (src/lib/forceLayout.ts) moves the modules until it comes to rest; measure the graph after that,
  // and after two frames, so the caption layer has followed the last move.
  await page.waitForFunction(() => {
    const cy = (window as Win).__cy;
    return !!cy && cy.nodes(".module").length > 0 && cy.scratch("_forceSettled") === true;
  }, null, { timeout: 60_000 });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

/**
 * Clicks a graph node or edge with the mouse where it is drawn. A scripted `emit("tap")` crashed renderers when
 * several tests ran at once; a real click does not, and is what a reader does. The graph is first scrolled into view
 * and left to settle after a resize (the view refits after a short debounce).
 */
async function tapElement(page: Page, id: string) {
  await page.locator(".graph").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => (window as Win).__cy!.width() === document.querySelector(".graph")!.clientWidth);
  await page.waitForTimeout(200);
  const point = await page.evaluate((elementId) => {
    const cy = (window as Win).__cy!;
    const el = cy.getElementById(elementId);
    const box = document.querySelector(".graph")!.getBoundingClientRect();
    const at = el.isEdge() ? (el as EdgeSingular).renderedMidpoint() : (el as NodeSingular).renderedPosition();
    return { x: box.x + at.x, y: box.y + at.y };
  }, id);
  await page.mouse.click(point.x, point.y);
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
  // SPEC-UI-001 REQ-019: nothing is selected, so the evidence sheet is closed and the empty state shows.
  await expect(page.locator(".evidence")).toHaveCount(0);
  await expect(page.locator(".evidence-empty")).toBeVisible();
  await page.getByRole("button", { name: "Show platform evidence" }).click();
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
  await expect(page.locator(".evidence")).toHaveCount(0);
  await expect(page.locator('.step[data-step-order="1"]')).toBeFocused();

  const step1 = page.locator('.step[data-step-order="1"]');
  await step1.click();
  expect(await highlighted(page)).toEqual(["Aand2024/P1/M3"]);
  await step1.click();
  expect(await highlighted(page)).toEqual([]);
  await expect(page.locator(".evidence")).toHaveCount(0);
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

  // The platform list of Home (SPEC-UI-001 REQ-010): 20 rows before "Show all", a filter field, one link per row.
  await page.goto("/");
  await expect(page.locator('[data-list="platforms"] > li')).toHaveCount(20);
  await tabUntil(page, 'input[type="search"][placeholder^="Filter"]');
  await page.keyboard.type("Aand2024");
  await expect(page.locator('[data-list="platforms"] > li')).toHaveCount(1);
  await page.keyboard.press("Tab"); // "View all in Browse"
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement?.getAttribute("href"))).toBe("#/platform/Aand2024/P1");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/platform\/Aand2024\/P1$/);
  await expect(page.locator("h1")).toHaveText("auto-optimization platform (AOP)");

  await page.goBack();
  await expect(page.getByRole("heading", { name: "Platforms", exact: true })).toBeVisible();
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
  // On-platform modules sit in the dashed platform box; the others in the solid frame around every module.
  p.modules.forEach((m, i) => {
    expect(parents[i], m.module_id).toBe(m.on_platform ? `boundary:${p.platform_id}` : `frame:${p.platform_id}`);
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

  await page.getByRole("button", { name: "Legend" }).click();
  await expect(page.locator('[data-legend="groups"] > li')).toHaveCount(5);
  await expect(page.locator('[data-legend="modes"] > li')).toHaveCount(6);
  await expect(page.locator('[data-legend="note"]')).toContainText("display choice of this site, not part of the dataset");
  await expect(page.locator('[data-legend="markers"]')).toContainText("Dashed edge");
  await expect(page.locator('[data-legend="markers"]')).toContainText("?");
});

test("Follow-up: the graph stays readable after Fit to view and the platform id uses the site monospace stack", async ({ page }) => {
  await page.goto(`/${REF}`);
  await waitForGraph(page);
  const zoomAtLoad = await page.evaluate(() => (window as Win).__cy!.zoom());
  expect(zoomAtLoad).toBeGreaterThanOrEqual(1);
  // SPEC-UI-001 REQ-018: the floating toolbar zooms in and out; Fit to view brings the readable fit back.
  const zoom = () => page.evaluate(() => (window as Win).__cy!.zoom());
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.getByRole("button", { name: "Zoom in" }).click();
  expect(await zoom()).toBeGreaterThan(zoomAtLoad * 1.3);
  await page.getByRole("button", { name: "Zoom out" }).click();
  expect(await zoom()).toBeLessThan(zoomAtLoad * 1.3);
  await page.getByRole("button", { name: "Fit to view" }).click();
  const after = await page.evaluate(() => {
    const cy = (window as Win).__cy!;
    const bb = cy.nodes(".module").renderedBoundingBox();
    return { zoom: cy.zoom(), x1: bb.x1, y1: bb.y1, y2: bb.y2, height: cy.height() };
  });
  expect(after.zoom).toBeGreaterThanOrEqual(1);
  expect(after.zoom).toBeLessThanOrEqual(1.5);
  // The first module and the vertical extent of the modules are inside the box.
  expect(after.x1).toBeGreaterThanOrEqual(0);
  expect(after.y1).toBeGreaterThanOrEqual(0);
  expect(after.y2).toBeLessThanOrEqual(after.height);
  const fontFamily = await page.locator(".platform-id code").evaluate((el) => getComputedStyle(el).fontFamily);
  // The site monospace stack starts with the self-hosted JetBrains Mono since SPEC-UI-001 REQ-003.
  expect(fontFamily.startsWith('"JetBrains Mono"')).toBe(true);
});

// SPEC-RELEASE-001 REQ-011: the module table says what its yes/no column means.
test("plain language: the module table's Part of the platform column and its note", async ({ page }) => {
  await page.goto("/#/platform/Aand2024/P1");
  const table = page.locator('[data-table="modules"]');
  await expect(table.locator("thead th")).toHaveText(["Id", "Type", "Name in paper", "Part of the platform"]);
  await expect(page.locator('[aria-labelledby="modules-heading"] .table-note')).toHaveText(
    "Part of the platform: yes for modules of the platform, no for equipment outside it that the loop uses.",
  );
});

// Screen check (SPEC-RELEASE-001 AC-7): at 375 px the longer header must not squeeze the ids into one letter per line.
test("screen check: module and connection ids stay on one line at 375 px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/#/platform/Aand2024/P1");
  await expect(page.locator('[data-table="modules"] tbody tr')).toHaveCount(5);
  for (const name of ["modules", "connections"]) {
    const lines = await page.locator(`[data-table="${name}"] tbody td > code`).evaluateAll((codes) =>
      codes.map((c) => new Set([...c.getClientRects()].map((r) => Math.round(r.top))).size),
    );
    expect(lines.length, name).toBeGreaterThan(0);
    expect(lines.every((n) => n === 1), `${name}: ${lines.join(",")}`).toBe(true);
  }
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(scroll).toBeLessThanOrEqual(client);
});

// SPEC-UI-001 phase 3 (REQ-017 to REQ-020): header card, graph toolbar and spacing, evidence sheet, step timeline.
const LARGE = "#/platform/Kim2026/P1";

const sheet = (page: Page) => page.getByRole("complementary", { name: "Evidence" });

test("UI AC-15: the header is a card with year, field and DOI, and an evidence button", async ({ page }) => {
  await page.goto(`/${REF}`);
  const header = page.locator(".platform-header");
  await expect(header.locator('[data-field="year"]')).toHaveText("2024");
  await expect(header.locator(".chip", { hasText: "Chemistry synthesis" })).toHaveAttribute("title", "chemistry_synthesis");
  await expect(header.getByRole("link", { name: "Paper DOI" })).toHaveAttribute("href", "https://doi.org/10.1039/d4re00138a");
  await expect(header.getByRole("button", { name: "Show platform evidence" })).toBeVisible();
});

test("UI AC-16: empty state, then selecting a node opens the sheet and Escape closes it", async ({ page }) => {
  await page.goto(`/${REF}`);
  await waitForGraph(page);
  await expect(page.locator(".evidence-empty")).toHaveText(/Select a module or connection/);
  await expect(sheet(page)).toHaveCount(0);

  await tapElement(page, "Aand2024/P1/M4");
  await expect(sheet(page)).toBeVisible();
  await expect(evidence(page, "kind")).toHaveText("Module");
  await expect(evidence(page, "id")).toHaveText("Aand2024/P1/M4");
  await expect(page.locator(".evidence-empty")).toBeHidden();
  await expect(sheet(page).getByRole("button", { name: "Close evidence" })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(sheet(page)).toHaveCount(0);
  await expect(page.locator(".evidence-empty")).toBeVisible();
});

test("UI AC-16: the close button closes the sheet and returns focus to the step that opened it", async ({ page }) => {
  await page.goto(`/${REF}`);
  await waitForGraph(page);
  const step = page.locator('.step[data-step-order="3"]');
  await step.focus();
  await page.keyboard.press("Enter");
  const close = sheet(page).getByRole("button", { name: "Close evidence" });
  await expect(close).toBeFocused();
  await expect(evidence(page, "kind")).toHaveText("Step");
  await close.click();
  await expect(sheet(page)).toHaveCount(0);
  await expect(step).toBeFocused();
  await expect(step).toHaveAttribute("aria-pressed", "false");
});

test("UI AC-16: at 375 px the sheet sits at the bottom of the screen without sideways scroll", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`/${REF}`);
  await waitForGraph(page);
  await page.locator('.step[data-step-order="1"]').click();
  await expect(sheet(page)).toBeVisible();
  const box = (await sheet(page).boundingBox())!;
  expect(Math.round(box.y + box.height)).toBeGreaterThanOrEqual(810);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(375);
  expect(box.height).toBeLessThan(812 * 0.7);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  await page.keyboard.press("Escape");
  await expect(sheet(page)).toHaveCount(0);
});

test("UI AC-17: the legend toggle shows and hides the legend over the graph", async ({ page }) => {
  await page.goto(`/${REF}`);
  const toggle = page.getByRole("button", { name: "Legend" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".legend")).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".legend")).toBeVisible();
  await toggle.click();
  await expect(page.locator(".legend")).toBeHidden();
});

/** Pairs of modules whose node-and-label boxes overlap. */
const labelOverlaps = (page: Page) =>
  page.evaluate(() => {
    const cy = (window as Win).__cy!;
    const boxes = cy.nodes(".module").map((n) => ({ id: n.id(), b: n.boundingBox({ includeLabels: true, includeOverlays: false }) }));
    const out: string[] = [];
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const [a, c] = [boxes[i]!.b, boxes[j]!.b];
        if (a.x1 < c.x2 && c.x1 < a.x2 && a.y1 < c.y2 && c.y1 < a.y2) out.push(`${boxes[i]!.id} / ${boxes[j]!.id}`);
      }
    }
    return out;
  });

for (const ref of [REF, LARGE]) {
  test(`UI AC-17: no two module labels overlap on ${ref}`, async ({ page }) => {
    await page.goto(`/${ref}`);
    await waitForGraph(page);
    expect(await labelOverlaps(page)).toEqual([]);
    expect(await page.evaluate(() => (window as Win).__cy!.nodes(".module").first().style("font-size"))).toBe("13px");
  });
}

test("UI AC-18: the steps form a timeline with a performer icon each", async ({ page }) => {
  await page.goto(`/${REF}`);
  const steps = page.locator(".steps .step");
  await expect(steps).toHaveCount(6);
  const titles = await page.locator(".steps .step-performer").evaluateAll((els) => els.map((e) => e.getAttribute("title")));
  expect(titles).toHaveLength(6);
  for (const t of titles) expect(t).toMatch(/^(robot|software|human|performer not stated)$/);
  await expect(page.locator(".steps .step-performer svg")).toHaveCount(6);
  await expect(steps.first().locator(".step-performer")).toHaveAttribute("title", "robot");
  await expect(steps.nth(4).locator(".step-performer")).toHaveAttribute("title", "software");
  await expect(steps.first().locator(".step-op")).toContainText("Dispense liquid");
});

// Follow-up to phase 3 (REQ-021 to REQ-023): readable graph labels, a sheet that covers no control, selection reset.
const nodeLabel = (page: Page, id: string) => page.evaluate((i) => String((window as Win).__cy!.getElementById(i).data("label")), id);

test("UI AC-19: graph labels are readable names; the codes stay in the legend and the sheet", async ({ page }) => {
  await page.goto(`/${REF}`);
  await waitForGraph(page);
  expect(await nodeLabel(page, "Aand2024/P1/M2")).toMatch(/^Flow reactor\n/);
  expect(await nodeLabel(page, "Aand2024/P1/M4")).toMatch(/^Optical instrument\n/);
  expect(await nodeLabel(page, "Aand2024/P1/M5")).toMatch(/^Sample handling station\n/);
  expect(await nodeLabel(page, "Aand2024/P1/E1")).toBe("Fixed tubing");
  expect(await nodeLabel(page, "Aand2024/P1/E3")).toBe("Data transfer");

  await tapElement(page, "Aand2024/P1/M2");
  await expect(evidence(page, "type")).toContainText("Flow reactor");
  await expect(evidence(page, "type").locator("code")).toHaveText("flow_reactor");
  await tapElement(page, "Aand2024/P1/E1");
  await expect(evidence(page, "type")).toContainText("Fixed tubing");
  await expect(evidence(page, "type").locator("code")).toHaveText("fixed_tubing");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Legend" }).click();
  const groups = page.locator('[data-legend="groups"]');
  await expect(groups.locator(".legend-types li", { has: page.locator("code", { hasText: /^flow_reactor$/ }) })).toContainText("Flow reactor");
  await expect(groups.locator(".legend-types li", { has: page.locator("code", { hasText: /^instrument_optical$/ }) })).toContainText("Optical instrument");
  const modes = page.locator('[data-legend="modes"]');
  await expect(modes.locator("li", { has: page.locator("code", { hasText: /^fixed_tubing$/ }) })).toContainText("Fixed tubing");
  await expect(modes.locator("li", { has: page.locator("code", { hasText: /^data_transfer$/ }) })).toContainText("Data transfer");
});

/** Whether the element at the centre of `locator` is that element or inside it, i.e. nothing covers it. */
const uncovered = (locator: ReturnType<Page["locator"]>) =>
  locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return !!hit && (hit === el || el.contains(hit));
  });

test("UI AC-20: at 1440 px the open sheet covers no header or graph control", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/${REF}`);
  await waitForGraph(page);
  await tapElement(page, "Aand2024/P1/M4");
  await expect(sheet(page)).toBeVisible();
  const header = page.locator(".platform-header");
  const controls = [
    header.getByRole("link", { name: "Paper DOI" }),
    header.getByRole("button", { name: "Show platform evidence" }),
    page.getByRole("button", { name: "Fit to view" }),
    page.getByRole("button", { name: "Zoom in" }),
    page.getByRole("button", { name: "Zoom out" }),
    page.getByRole("button", { name: "Legend" }),
  ];
  for (const c of controls) expect(await uncovered(c), await c.getAttribute("aria-label") ?? "DOI").toBe(true);

  // The sheet sits beside the content, not over it, and the graph canvas follows its narrower box.
  const sheetBox = (await sheet(page).boundingBox())!;
  for (const sel of [".platform-header", ".graph-wrap", ".viewer"]) {
    const b = (await page.locator(sel).boundingBox())!;
    expect(b.x + b.width, sel).toBeLessThanOrEqual(sheetBox.x);
  }
  const widths = await page.evaluate(() => [(window as Win).__cy!.width(), document.querySelector(".graph")!.clientWidth]);
  expect(widths[0]).toBe(widths[1]);
  // The selected module stays in the narrower view.
  const m4 = await page.evaluate(() => {
    const cy = (window as Win).__cy!;
    const b = cy.getElementById("Aand2024/P1/M4").renderedBoundingBox();
    return { x1: b.x1, x2: b.x2, width: cy.width() };
  });
  expect(m4.x1).toBeGreaterThanOrEqual(0);
  expect(m4.x2).toBeLessThanOrEqual(m4.width);

  // A row far down the page opens the sheet in view; the DOI link still works.
  await page.locator('[data-table="connections"] tbody tr').first().click();
  await expect(evidence(page, "kind")).toHaveText("Connection");
  const box = (await sheet(page).boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeLessThan(900);
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(await uncovered(header.getByRole("link", { name: "Paper DOI" }))).toBe(true);
});

test("UI AC-21: the selection resets when the platform route is entered again", async ({ page }) => {
  await page.goto(`/${REF}`);
  await waitForGraph(page);
  await page.locator('.step[data-step-order="2"]').click();
  await expect(sheet(page)).toBeVisible();

  // Another route and back by the history.
  await page.getByRole("navigation").getByRole("link", { name: "Trends", exact: true }).click();
  await expect(page).toHaveURL(/#\/trends$/);
  await page.goBack();
  await waitForGraph(page);
  await expect(page.locator(".platform-header h1")).toBeVisible();
  await expect(sheet(page)).toHaveCount(0);
  await expect(page.locator(".evidence-empty")).toBeVisible();
  await expect(page.locator('.step[aria-pressed="true"]')).toHaveCount(0);

  // Another route and back by setting the hash.
  await page.locator('.step[data-step-order="2"]').click();
  await expect(sheet(page)).toBeVisible();
  await page.evaluate(() => (window.location.hash = "#/about"));
  await expect(page).toHaveURL(/#\/about$/);
  await page.evaluate((h) => (window.location.hash = h), REF);
  await waitForGraph(page);
  await expect(page.locator(".platform-header h1")).toBeVisible();
  await expect(sheet(page)).toHaveCount(0);

  // Straight to another platform with the same platform number.
  await page.locator('.step[data-step-order="2"]').click();
  await expect(sheet(page)).toBeVisible();
  await page.evaluate((h) => (window.location.hash = h), LARGE);
  await expect(page.locator(".platform-id")).toContainText("Kim2026/P1");
  await expect(sheet(page)).toHaveCount(0);
  await expect(page.locator('.step[aria-pressed="true"]')).toHaveCount(0);
});

/** Module nodes (with labels) whose rendered box leaves the graph's box; also whether Cytoscape matches the box. */
const outsideNodes = (page: Page) =>
  page.evaluate(() => {
    const cy = (window as Win).__cy!;
    const box = document.querySelector(".graph")!;
    const out = cy
      .nodes(".module")
      .filter((n) => {
        const b = n.renderedBoundingBox({ includeLabels: true });
        return b.x1 < 0 || b.y1 < 0 || b.x2 > cy.width() || b.y2 > cy.height();
      })
      .map((n) => n.id());
    return { out, sized: cy.width() === box.clientWidth && cy.height() === box.clientHeight };
  });

test("UI AC-24: at 1440 px the whole graph stays in view as the sheet opens and closes", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/${REF}`);
  await waitForGraph(page);
  expect(await outsideNodes(page)).toEqual({ out: [], sized: true });

  await tapElement(page, "Aand2024/P1/M4");
  await expect(sheet(page)).toBeVisible();
  await expect.poll(() => outsideNodes(page)).toEqual({ out: [], sized: true });

  await page.keyboard.press("Escape");
  await expect(sheet(page)).toHaveCount(0);
  await expect.poll(() => outsideNodes(page)).toEqual({ out: [], sized: true });
});

test("UI AC-24: a zoom the reader set is kept when the sheet opens", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/${REF}`);
  await waitForGraph(page);
  await page.getByRole("button", { name: "Zoom in" }).click();
  const zoom = await page.evaluate(() => (window as Win).__cy!.zoom());
  await page.locator('.step[data-step-order="3"]').click();
  await expect(sheet(page)).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as Win).__cy!.width() === document.querySelector(".graph")!.clientWidth)).toBe(true);
  expect(await page.evaluate(() => (window as Win).__cy!.zoom())).toBeCloseTo(zoom, 6);
});

test("UI AC-24: the largest graph keeps a zoom of at least 0.75 when the sheet opens", async ({ page }) => {
  // The force-laid-out graph may fit down to 0.75 so its two boxes show whole (src/lib/viewport.ts CLUSTER_READABLE_ZOOM).
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/${LARGE}`);
  await waitForGraph(page);
  expect(await page.evaluate(() => (window as Win).__cy!.zoom())).toBeGreaterThanOrEqual(0.75);
  await page.locator('.step[data-step-order="1"]').click();
  await expect(sheet(page)).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as Win).__cy!.width() === document.querySelector(".graph")!.clientWidth)).toBe(true);
  expect(await page.evaluate(() => (window as Win).__cy!.zoom())).toBeGreaterThanOrEqual(0.75);
});
