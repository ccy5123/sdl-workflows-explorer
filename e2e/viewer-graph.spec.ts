// UI AC-35 to AC-38: platform graph labels and captions, the phone layout, the minimap, and step previews
// (SPEC-UI-001, platform viewer graph follow-up). Runs against the e2e build, which exposes window.__cy.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import type { Core, NodeSingular } from "cytoscape";
import type { PlatformFile, PlatformGraph } from "../src/data/types";

type Win = Window & { __cy?: Core };

// The force layout animates for several seconds before it rests, longer while other tests share the machine.
test.describe.configure({ timeout: 120_000 });

const AAND = "Aand2024/P1";
const KIM = "Kim2026/P1";

function platform(id: string): PlatformGraph {
  const file = join(import.meta.dirname, "..", "public", "data", "platforms", `${id.split("/")[0]}.json`);
  const data = JSON.parse(readFileSync(file, "utf8")) as PlatformFile;
  return data.platforms.find((p) => p.platform_id === id)!;
}

async function waitForGraph(page: Page) {
  // The force layout (src/lib/forceLayout.ts) moves the modules until it comes to rest; measure the graph after that,
  // and after two frames, so the caption layer has followed the last move.
  await page.waitForFunction(() => {
    const cy = (window as Win).__cy;
    return !!cy && cy.nodes(".module").length > 0 && cy.scratch("_forceSettled") === true;
  }, null, { timeout: 60_000 });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

/** Clicks a graph node where it is drawn (a real mouse click; see e2e/viewer.spec.ts tapElement). */
async function tapNode(page: Page, id: string) {
  await page.locator(".graph").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => (window as Win).__cy!.width() === document.querySelector(".graph")!.clientWidth);
  await page.waitForTimeout(200);
  const point = await page.evaluate((nodeId) => {
    const at = ((window as Win).__cy!.getElementById(nodeId) as NodeSingular).renderedPosition();
    const box = document.querySelector(".graph")!.getBoundingClientRect();
    return { x: box.x + at.x, y: box.y + at.y };
  }, id);
  await page.mouse.click(point.x, point.y);
}

const sheet = (page: Page) => page.getByRole("complementary", { name: "Evidence" });
const highlighted = (page: Page) => page.evaluate(() => (window as Win).__cy!.nodes(".highlighted").map((n) => n.id()).sort());
const dimmedCount = (page: Page) => page.evaluate(() => (window as Win).__cy!.nodes(".dimmed").length);

interface Rect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Page rectangles of each caption, of each module's label box and of each module's dot, all in page coordinates
 * (Cytoscape's rendered boxes are relative to the graph box).
 */
const geometry = (page: Page) =>
  page.evaluate(() => {
    const cy = (window as Win).__cy!;
    const g = document.querySelector(".graph")!.getBoundingClientRect();
    const toPage = (b: { x1: number; y1: number; x2: number; y2: number }) => ({ x1: b.x1 + g.x, y1: b.y1 + g.y, x2: b.x2 + g.x, y2: b.y2 + g.y });
    const nodes = cy.nodes(".module").map((n) => ({
      id: n.id(),
      label: toPage(n.renderedBoundingBox({ includeNodes: false, includeEdges: false, includeLabels: true, includeOverlays: false })),
      all: toPage(n.renderedBoundingBox({ includeLabels: true, includeOverlays: false })),
      dot: toPage(n.renderedBoundingBox({ includeLabels: false, includeOverlays: false })),
    }));
    const captions = [...document.querySelectorAll<HTMLElement>(".graph-caption")].map((el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return {
        id: el.dataset.module!,
        text: el.textContent ?? "",
        rect: { x1: r.left, y1: r.top, x2: r.right, y2: r.bottom },
        height: r.height,
        width: r.width,
        lineHeight: parseFloat(s.lineHeight),
        overflow: s.textOverflow,
        clamp: s.getPropertyValue("-webkit-line-clamp"),
        hidden: el.closest("[aria-hidden='true']") !== null,
      };
    });
    return { nodes, captions };
  });

const overlaps = (a: Rect, b: Rect, tolerance = 0.5) =>
  a.x1 + tolerance < b.x2 && b.x1 + tolerance < a.x2 && a.y1 + tolerance < b.y2 && b.y1 + tolerance < a.y2;

for (const id of [AAND, KIM]) {
  test(`UI AC-35: node labels are the bold type only and each named module has one caption on ${id}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/#/platform/${id}`);
    await waitForGraph(page);
    const p = platform(id);

    const labels = await page.evaluate(() =>
      (window as Win).__cy!.nodes(".module").map((n) => ({ id: n.id(), label: String(n.data("label")), weight: n.style("font-weight") })),
    );
    for (const m of p.modules) {
      const l = labels.find((x) => x.id === m.module_id)!;
      expect(l.weight, m.module_id).toBe("bold");
      const [type, ...rest] = l.label.split("\n");
      expect(type!.trim().length, m.module_id).toBeGreaterThan(0);
      if (m.name_in_paper) expect(l.label, m.module_id).not.toContain(m.name_in_paper);
      // Only reserved blank lines follow the type: room for the caption below it.
      for (const line of rest) expect(line.replace(/[\s\u200b]/g, ""), m.module_id).toBe("");
    }

    const named = p.modules.filter((m) => m.name_in_paper);
    await expect(page.locator(".graph-caption")).toHaveCount(named.length);
    await expect.poll(async () => (await geometry(page)).captions.every((c) => c.width > 0)).toBe(true);
    const { nodes, captions } = await geometry(page);
    for (const m of named) {
      const mine = captions.filter((c) => c.id === m.module_id);
      expect(mine, m.module_id).toHaveLength(1);
      const c = mine[0]!;
      expect(c.text).toBe(m.name_in_paper);
      expect(c.hidden).toBe(true);
      expect(c.overflow).toBe("ellipsis");
      expect(c.clamp).toBe("2");
      expect(c.height, m.module_id).toBeLessThanOrEqual(2 * c.lineHeight + 1);
      const own = nodes.find((n) => n.id === m.module_id)!;
      // Below its own dot, inside its own label box, and clear of every other module and its label.
      expect(c.rect.y1, m.module_id).toBeGreaterThanOrEqual(own.dot.y2);
      expect(c.rect.x1, m.module_id).toBeGreaterThanOrEqual(own.label.x1 - 1);
      expect(c.rect.x2, m.module_id).toBeLessThanOrEqual(own.label.x2 + 1);
      expect(c.rect.y2, m.module_id).toBeLessThanOrEqual(own.label.y2 + 1);
      for (const n of nodes) {
        if (n.id !== m.module_id) expect(overlaps(c.rect, n.all), `${m.module_id} caption / ${n.id}`).toBe(false);
      }
      for (const other of captions) {
        if (other !== c) expect(overlaps(c.rect, other.rect), `${m.module_id} / ${other.id}`).toBe(false);
      }
    }
  });
}

test("UI AC-35: a selected module shows its full name in the paper in the evidence sheet", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/#/platform/${AAND}`);
  await waitForGraph(page);
  const m4 = platform(AAND).modules.find((m) => m.module_id === `${AAND}/M4`)!;
  await tapNode(page, m4.module_id);
  await expect(sheet(page)).toBeVisible();
  await expect(sheet(page).locator("dt", { hasText: "Name in paper" })).toBeVisible();
  await expect(sheet(page).locator('[data-field="name"]')).toHaveText(m4.name_in_paper!);
});

/** Module positions, the graph's rendered width and position, the box width and the zoom. */
const layout = (page: Page) =>
  page.evaluate(() => {
    const cy = (window as Win).__cy!;
    const pos = Object.fromEntries(cy.nodes(".module").map((n) => [n.id(), n.position()]));
    const bb = cy.elements().renderedBoundingBox();
    return { pos, x1: bb.x1, x2: bb.x2, width: cy.width(), box: document.querySelector(".graph")!.clientWidth, zoom: cy.zoom() };
  });

/** Whether every module label sits under its dot (the force layout keeps one placement at every width). */
const labelsUnder = (page: Page) =>
  page.evaluate(() => (window as Win).__cy!.nodes(".module").every((n) => n.style("text-valign") === "bottom"));

/** The whole graph, both boxes and the frame's caption included, lies inside the canvas. */
const wholeInView = (l: Awaited<ReturnType<typeof layout>>) => l.width === l.box && l.x1 >= 0 && l.x2 <= l.width;

for (const width of [375, 1440]) {
  test(`UI AC-36: at ${width} px the whole graph is in view at zoom 0.75 or more, labels under the dots`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 800 ? 812 : 900 });
    await page.goto(`/#/platform/${AAND}`);
    await waitForGraph(page);
    const l = await layout(page);
    expect(wholeInView(l)).toBe(true);
    expect(l.zoom).toBeGreaterThanOrEqual(0.75);
    expect(await labelsUnder(page)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
}

test("UI AC-36: narrowing the window from 1440 to 375 px refits the graph", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/#/platform/${AAND}`);
  await waitForGraph(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await expect
    .poll(async () => {
      const l = await layout(page);
      return wholeInView(l) && l.zoom >= 0.75;
    }, { timeout: 60_000 })
    .toBe(true);
  expect(await labelsUnder(page)).toBe(true);
});

test("Force layout: the first layout is the start with the fewest edge crossings", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const id of [KIM, AAND]) {
    await page.goto(`/#/platform/${id}`);
    await waitForGraph(page);
    const starts = await page.evaluate(() => (window as Win).__cy!.scratch("_forceStarts") as { chosen: number; crossings: number[] });
    expect(starts.crossings.length, id).toBe(3);
    expect(starts.crossings[starts.chosen], id).toBe(Math.min(...starts.crossings));
  }
});

test("Force layout: the dashed box holds the platform's modules and the solid frame holds every module", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/#/platform/${KIM}`);
  await waitForGraph(page);
  const check = await page.evaluate(() => {
    const cy = (window as Win).__cy!;
    type Box = { x1: number; x2: number; y1: number; y2: number };
    const within = (a: Box, b: Box) => a.x1 >= b.x1 && a.x2 <= b.x2 && a.y1 >= b.y1 && a.y2 <= b.y2;
    const meet = (a: Box, b: Box) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
    const frame = cy.nodes(".frame").boundingBox({ includeLabels: false, includeOverlays: false });
    const dashed = cy.nodes(".boundary").boundingBox({ includeLabels: false, includeOverlays: false });
    const modules = cy.nodes(".module").toArray() as NodeSingular[];
    const label = (n: NodeSingular) => n.boundingBox({ includeLabels: true, includeOverlays: false });
    return {
      outsideFrame: modules.filter((n) => !within(label(n), frame)).map((n) => n.id()),
      onOutsideDashed: modules.filter((n) => n.parent().is(".boundary") && !within(label(n), dashed)).map((n) => n.id()),
      offInDashed: modules.filter((n) => !n.parent().is(".boundary") && meet(label(n), dashed)).map((n) => n.id()),
      caption: String(cy.nodes(".frame").data("label")),
    };
  });
  expect(check.outsideFrame).toEqual([]);
  expect(check.onOutsideDashed).toEqual([]);
  expect(check.offInDashed).toEqual([]);
  expect(check.caption).toMatch(/^Dashed box: the platform\. Modules outside it are equipment/);
});

test("Force layout: a dragged module follows the pointer and is not selected", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/#/platform/${AAND}`);
  await waitForGraph(page);
  const id = `${AAND}/M1`;
  const at = () =>
    page.evaluate((i) => {
      const cy = (window as Win).__cy!;
      const p = cy.getElementById(i).renderedPosition();
      const box = cy.container()!.getBoundingClientRect();
      return { x: box.left + p.x, y: box.top + p.y };
    }, id);
  await page.locator(".graph").scrollIntoViewIfNeeded();
  const start = await at();
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 60, start.y + 40, { steps: 8 });
  const held = await at();
  expect(Math.hypot(held.x - (start.x + 60), held.y - (start.y + 40))).toBeLessThan(6);
  await page.mouse.up();
  await page.waitForFunction(() => (window as Win).__cy!.scratch("_forceSettled") === true, null, { timeout: 60_000 });
  await expect(sheet(page)).toHaveCount(0);
});

const panX = (page: Page) => page.evaluate(() => (window as Win).__cy!.pan().x);

test("UI AC-37: a graph that does not fit shows a minimap; clicking it pans the graph", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/#/platform/${KIM}`);
  await waitForGraph(page);
  // The fitted graph is in view whole; zoomed in twice it no longer fits.
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.getByRole("button", { name: "Zoom in" }).click();
  const minimap = page.locator(".graph-minimap");
  await expect(minimap).toBeVisible();
  await expect(minimap).toHaveAttribute("aria-hidden", "true");
  await expect(minimap.locator(".graph-minimap-view")).toHaveCount(1);
  await expect(minimap.locator(".graph-minimap-node")).toHaveCount(platform(KIM).modules.length);

  const before = await panX(page);
  const box = (await minimap.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.85, box.y + box.height / 2);
  // The view moves right over the graph, so the graph's pan moves left.
  await expect.poll(() => panX(page)).toBeLessThan(before - 50);
});

test("UI AC-37: a graph that fits shows no minimap", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/#/platform/${AAND}`);
  await waitForGraph(page);
  await page.waitForTimeout(300);
  await expect(page.locator(".graph-minimap")).toBeHidden();
});

async function tabUntil(page: Page, selector: string, max = 80) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    if (await page.evaluate((sel) => document.activeElement?.matches(sel) ?? false, selector)) return;
  }
  throw new Error(`Tab did not reach ${selector} within ${max} presses`);
}

test("UI AC-38: hovering or focusing a step previews its modules; a click keeps them until Escape", async ({ page }) => {
  await page.goto(`/#/platform/${AAND}`);
  await waitForGraph(page);
  const step3 = page.locator('.step[data-step-order="3"]');

  await step3.hover();
  await expect.poll(() => highlighted(page)).toEqual([`${AAND}/M4`]);
  expect(await dimmedCount(page)).toBe(4);
  await expect(sheet(page)).toHaveCount(0);

  await page.mouse.move(0, 0);
  await expect.poll(() => highlighted(page)).toEqual([]);
  expect(await dimmedCount(page)).toBe(0);

  await tabUntil(page, '.step[data-step-order="2"]');
  await expect.poll(() => highlighted(page)).toEqual([`${AAND}/M2`]);
  await expect(sheet(page)).toHaveCount(0);
  await page.keyboard.press("Tab");
  await expect.poll(() => highlighted(page)).toEqual([`${AAND}/M4`]);

  await step3.click();
  await expect(sheet(page)).toBeVisible();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(100);
  expect(await highlighted(page)).toEqual([`${AAND}/M4`]);
  expect(await dimmedCount(page)).toBe(4);

  await page.keyboard.press("Escape");
  await expect(sheet(page)).toHaveCount(0);
  await expect.poll(() => highlighted(page)).toEqual([]);
  expect(await dimmedCount(page)).toBe(0);
});
