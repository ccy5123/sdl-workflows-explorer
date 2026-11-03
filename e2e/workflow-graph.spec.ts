// UI AC-39 to AC-41: the read-only workflow graph on the Workflow builder page (SPEC-UI-001), against the e2e build,
// which exposes the graph's Cytoscape instance as window.__wfCy.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import type { Core } from "cytoscape";
import type { SimulationJson } from "../src/data/types";
import { catalogOf, decodeWorkflow, isTransferBoundary, transferAt, type WorkflowState } from "../src/lib/workflowState";

type Win = Window & { __wfCy?: Core };

const main = (page: Page) => page.locator("main");
const card = (page: Page) => main(page).locator("section", { has: page.getByRole("heading", { name: "Workflow graph" }) });

const sim = JSON.parse(readFileSync(join(import.meta.dirname, "..", "public", "data", "simulation.json"), "utf8")) as SimulationJson;
const catalog = catalogOf(sim);

/** The builder's state, decoded from the page's URL as the page itself does. */
const stateOf = (page: Page): WorkflowState => decodeWorkflow(new URL(page.url()).hash.split("?")[1] ?? "", catalog).state;

interface GraphInfo {
  nodes: { id: string; label: string }[];
  edges: { id: string; source: string; target: string; label: string; steps: string; colour: string; lineStyle: string }[];
}

const graph = (page: Page) =>
  page.evaluate((): GraphInfo | null => {
    const cy = (window as Win).__wfCy;
    if (!cy) return null;
    return {
      nodes: cy.nodes(".module").map((n) => ({ id: n.id(), label: String(n.data("label")) })),
      edges: cy.edges().map((e) => ({
        id: e.id(),
        source: e.source().id(),
        target: e.target().id(),
        label: String(e.data("label")),
        steps: String(e.data("steps")),
        colour: e.style("line-color"),
        lineStyle: e.style("line-style"),
      })),
    };
  });

async function addStep(page: Page, uo: string, moduleType: string) {
  const m = main(page);
  await m.getByLabel("Unit operation of the new step").selectOption(uo);
  await m.getByLabel("Type of its new module").selectOption(moduleType);
  await m.getByRole("button", { name: "Add step" }).click();
}

test("UI AC-39: the workflow graph follows the steps, modules and transfers as they are edited", async ({ page }) => {
  await page.goto("/#/workflow");
  await expect(main(page).locator("h1")).toHaveText("Workflow builder");
  await expect(card(page)).toBeVisible();
  await expect(card(page).locator(".wf-graph-empty")).toBeVisible();
  await expect(card(page).locator(".graph")).toHaveCount(0);
  expect(await graph(page)).toBeNull();

  await addStep(page, "dispense_liquid", "liquid_handler");
  await expect.poll(async () => (await graph(page))?.nodes.length).toBe(1);
  await expect(card(page).locator(".wf-graph-empty")).toHaveCount(0);
  expect((await graph(page))!.nodes[0]!.label).toMatch(/^Liquid handler\n/);
  await expect(card(page).locator('.graph-caption[data-module="wf-m1"]')).toHaveText("Module 1 · 1 device");

  await addStep(page, "react_thermal", "thermal_unit");
  await expect.poll(async () => (await graph(page))?.edges.length).toBe(1);
  let g = (await graph(page))!;
  expect(g.nodes.map((n) => n.id)).toEqual(["wf-m1", "wf-m2"]);
  expect(g.edges[0]).toMatchObject({ source: "wf-m1", target: "wf-m2", label: "not specified", steps: "1→2", lineStyle: "solid" });
  await expect(card(page).locator(".graph")).toHaveAttribute("aria-label", /2 modules, 1 transfer\b/);

  await main(page).getByLabel("Transfer mode between steps 1 and 2").selectOption("robot_arm_gantry");
  await expect.poll(async () => (await graph(page))?.edges[0]?.label).toBe("Robot arm / gantry");
  g = (await graph(page))!;
  // Okabe–Ito orange of the robot arm / gantry mode (src/lib/moduleGroups.ts), as Cytoscape reports it.
  expect(g.edges[0]!.colour).toBe("rgb(230,159,0)");
  expect(g.edges[0]!.lineStyle).toBe("solid");

  // Removing step 2 removes the transfer; its module stays in the builder, so the graph keeps it, unconnected.
  await main(page).getByRole("button", { name: "Remove step 2" }).click();
  await expect.poll(async () => (await graph(page))?.edges.length).toBe(0);
  g = (await graph(page))!;
  expect(g.nodes.map((n) => n.id)).toEqual(["wf-m1", "wf-m2"]);
  await expect(card(page).locator(".graph")).toHaveAttribute("aria-label", /2 modules, 0 transfers/);

  await main(page).getByRole("button", { name: "Remove step 1" }).click();
  await expect(card(page).locator(".wf-graph-empty")).toBeVisible();
  await expect(card(page).locator(".graph")).toHaveCount(0);
});

async function fillFrom(page: Page, platformId: string) {
  const m = main(page);
  await m.getByLabel("Start from a coded platform").selectOption(platformId);
  await m.getByRole("button", { name: "Fill the builder from this platform" }).click();
  await expect(m.locator(".wf-message")).toContainText(`Filled from ${platformId}`);
}

test("UI AC-40: filled from Aand2024/P1, the graph has a node per module and a solid edge per transfer boundary", async ({ page }) => {
  await page.goto("/#/workflow");
  await fillFrom(page, "Aand2024/P1");
  const s = stateOf(page);
  const boundaries = s.steps.map((_, k) => k + 1).filter((i) => isTransferBoundary(s, i));
  expect(s.steps.length).toBeGreaterThan(1);
  expect(boundaries.length).toBeGreaterThan(0);

  await expect.poll(async () => (await graph(page))?.edges.length).toBe(boundaries.length);
  const g = (await graph(page))!;
  expect(g.nodes).toHaveLength(s.modules.length);
  expect(g.edges.map((e) => [e.id, e.source, e.target])).toEqual(
    boundaries.map((i) => [`wf-t${i}`, `wf-m${s.steps[i - 1]!.module}`, `wf-m${s.steps[i]!.module}`]),
  );
  for (const e of g.edges) expect(e.lineStyle, e.id).toBe("solid");
  for (const i of boundaries) {
    const e = g.edges.find((x) => x.id === `wf-t${i}`)!;
    expect(e.steps).toBe(`${i}→${i + 1}`);
    if (transferAt(s, i).mode === "na") expect(e.label).toBe("not specified");
    else expect(e.label).not.toContain("not specified");
  }
  await expect(card(page).locator(".graph")).toHaveAttribute(
    "aria-label",
    new RegExp(`${s.modules.length} modules, ${boundaries.length} transfers`),
  );
});

/** Positions of the modules of steps 1 to 3, the graph box and the page's sideways overflow. */
const layout = (page: Page, modules: string[]) =>
  page.evaluate((ids) => {
    const cy = (window as Win).__wfCy!;
    const box = document.querySelector(".wf-graph .graph")!;
    const wrap = document.querySelector(".wf-graph .graph-wrap")!.getBoundingClientRect();
    const column = document.querySelector("main")!.getBoundingClientRect();
    return {
      pos: ids.map((id) => cy.getElementById(id).position()),
      sized: cy.width() === box.clientWidth,
      wrapLeft: wrap.left,
      wrapRight: wrap.right,
      columnLeft: column.left,
      columnRight: column.right,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  }, modules);

for (const width of [375, 1440]) {
  test(`UI AC-41: at ${width} px the graph fits the column without sideways scroll${width < 800 ? " and runs top to bottom" : ""}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 800 ? 812 : 900 });
    await page.goto("/#/workflow");
    await fillFrom(page, "Aand2024/P1");
    const s = stateOf(page);
    // The first three steps of Aand2024/P1 sit on three different modules, joined in step order.
    const chain = s.steps.slice(0, 3).map((st) => `wf-m${st.module}`);
    expect(new Set(chain).size).toBe(3);
    await expect.poll(async () => (await graph(page))?.nodes.length).toBe(s.modules.length);
    await card(page).scrollIntoViewIfNeeded();
    await expect.poll(async () => (await layout(page, chain)).sized).toBe(true);
    const l = await layout(page, chain);
    expect(l.overflow).toBe(0);
    expect(l.wrapLeft).toBeGreaterThanOrEqual(l.columnLeft - 0.5);
    expect(l.wrapRight).toBeLessThanOrEqual(l.columnRight + 0.5);
    const along = width < 800 ? l.pos.map((p) => p.y) : l.pos.map((p) => p.x);
    expect(along[0]).toBeLessThan(along[1]!);
    expect(along[1]).toBeLessThan(along[2]!);
  });
}
