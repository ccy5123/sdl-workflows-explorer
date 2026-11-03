// AC-3: Cytoscape elements and stylesheet (REQ-006, REQ-008, REQ-009, REQ-010).
import { describe, expect, it } from "vitest";
import { boundaryId, buildElements, buildStylesheet, captionReserve, LABEL_END } from "../src/lib/graphElements";
import { fixturePlatform } from "./fixtures/platform";

const platform = fixturePlatform();
const elements = buildElements(platform);
const nodes = elements.filter((e) => e.group === "nodes");
const edges = elements.filter((e) => e.group === "edges");
const classesOf = (e: { classes?: string | string[] }) =>
  (Array.isArray(e.classes) ? e.classes.join(" ") : (e.classes ?? "")).split(" ").filter(Boolean);
const edge = (id: string) => edges.find((e) => e.data.id === id)!;

describe("buildElements", () => {
  it("returns one platform boundary node, labelled", () => {
    const parents = nodes.filter((n) => classesOf(n).includes("boundary"));
    expect(parents).toHaveLength(1);
    expect(parents[0]!.data.id).toBe(boundaryId(platform));
    expect(parents[0]!.data.label).toContain("test platform");
  });

  it("sets parent exactly on modules with on_platform true", () => {
    const modules = nodes.filter((n) => !classesOf(n).includes("boundary"));
    expect(modules.map((n) => n.data.id)).toEqual(platform.modules.map((m) => m.module_id));
    for (const m of platform.modules) {
      const node = modules.find((n) => n.data.id === m.module_id)!;
      expect(node.data.parent).toBe(m.on_platform ? boundaryId(platform) : undefined);
    }
  });

  it("labels nodes with the readable module type and room for the name below it, keeps the code, and colours them by display group", () => {
    const m1 = nodes.find((n) => n.data.id === "Test2020/P1/M1")!;
    // SPEC-UI-001 UI AC-35: the name in the paper is drawn as an HTML caption in two reserved lines below the type.
    expect(m1.data.label).toBe(`Software\n${captionReserve("planner")}\n${captionReserve("planner")}${LABEL_END}`);
    expect(m1.data.label).not.toContain("planner");
    expect(m1.data.code).toBe("software");
    expect(m1.data.colour).toBe("#CC79A7");
    const m2 = nodes.find((n) => n.data.id === "Test2020/P1/M2")!;
    expect(m2.data.label).toMatch(/^Flow reactor/);
    const m3 = nodes.find((n) => n.data.id === "Test2020/P1/M3")!;
    expect(m3.data.label).toBe("Other module (unmapped)");
    expect(m3.data.code).toBe("unmapped");
  });

  it("returns one edge per connection, keeping parallel edges", () => {
    expect(edges.map((e) => e.data.id)).toEqual(platform.connections.map((c) => c.edge_id));
    for (const c of platform.connections) {
      expect(edge(c.edge_id).data.source).toBe(c.from_module);
      expect(edge(c.edge_id).data.target).toBe(c.to_module);
    }
    expect(edges.filter((e) => e.data.source === "Test2020/P1/M2" && e.data.target === "Test2020/P1/M3")).toHaveLength(2);
  });

  it("puts class inferred exactly on the stated=false edge", () => {
    expect(edges.filter((e) => classesOf(e).includes("inferred")).map((e) => e.data.id)).toEqual(["Test2020/P1/E2"]);
  });

  it("puts class uncertain and a ? in the label exactly on the uncertain edge", () => {
    expect(edges.filter((e) => classesOf(e).includes("uncertain")).map((e) => e.data.id)).toEqual(["Test2020/P1/E3"]);
    expect(edges.filter((e) => String(e.data.label).includes("?")).map((e) => e.data.id)).toEqual(["Test2020/P1/E3"]);
  });

  it("gives every edge its transfer-mode class, readable label, code and colour", () => {
    expect(classesOf(edge("Test2020/P1/E1"))).toContain("mode-data_transfer");
    expect(edge("Test2020/P1/E1").data.label).toBe("Data transfer");
    expect(edge("Test2020/P1/E1").data.code).toBe("data_transfer");
    expect(edge("Test2020/P1/E1").data.colour).toBe("#999999");
    expect(classesOf(edge("Test2020/P1/E2"))).toContain("mode-human_transfer");
    expect(edge("Test2020/P1/E2").data.label).toBe("Human transfer");
    expect(classesOf(edge("Test2020/P1/E3"))).toContain("mode-fixed_tubing");
    expect(edge("Test2020/P1/E3").data.label).toBe("Fixed tubing ?");
  });

  it("adds no boundary node when no module is on the platform", () => {
    const off = fixturePlatform();
    off.modules = off.modules.map((m) => ({ ...m, on_platform: false }));
    expect(buildElements(off).filter((e) => classesOf(e).includes("boundary"))).toHaveLength(0);
  });

  it("uses the platform id in the boundary label when the name is null", () => {
    const unnamed = { ...fixturePlatform(), name: null };
    const boundary = buildElements(unnamed).find((e) => classesOf(e).includes("boundary"))!;
    expect(boundary.data.label).toContain("Test2020/P1");
  });
});

describe("buildStylesheet", () => {
  const sheet = buildStylesheet();
  const block = (selector: string) => sheet.find((b) => "selector" in b && b.selector === selector) as
    | { selector: string; style: Record<string, unknown> }
    | undefined;

  it("sets curve-style bezier and arrows on edges", () => {
    expect(block("edge")?.style["curve-style"]).toBe("bezier");
    expect(block("edge")?.style["target-arrow-shape"]).toBeTruthy();
  });

  it("dashes inferred edges and thins data edges", () => {
    expect(block("edge.inferred")?.style["line-style"]).toBe("dashed");
    const normal = Number(block("edge")?.style["width"]);
    const data = Number(block("edge.mode-data_transfer")?.style["width"]);
    expect(data).toBeLessThan(normal);
  });

  it("has highlight and dim styles", () => {
    expect(block("node.dimmed")).toBeDefined();
    expect(block("node.highlighted")).toBeDefined();
  });

  // SPEC-UI-001 UI AC-35, UI AC-38: bold type labels; dimming fades over 150 ms unless the reader asks for less motion.
  it("draws node labels in bold and fades opacity, without the fade under reduced motion", () => {
    expect(block("node")?.style["font-weight"]).toBe("bold");
    for (const s of ["node", "edge"]) {
      expect(block(s)?.style["transition-property"]).toBe("opacity");
      expect(block(s)?.style["transition-duration"]).toBe(150);
    }
    const still = buildStylesheet("light", { reducedMotion: true });
    const stillBlock = (selector: string) =>
      (still.find((b) => "selector" in b && b.selector === selector) as unknown as { style: Record<string, unknown> }).style;
    for (const s of ["node", "edge"]) expect(stillBlock(s)["transition-property"]).toBeUndefined();
  });
});

describe("buildStylesheet labels beside the dot (SPEC-UI-001 UI AC-36)", () => {
  it("puts module labels to the right of the dot only when asked", () => {
    const moduleBlock = (sheet: ReturnType<typeof buildStylesheet>) =>
      sheet.find((b) => "selector" in b && b.selector === "node.module") as unknown as { style: Record<string, unknown> } | undefined;
    expect(moduleBlock(buildStylesheet("light"))).toBeUndefined();
    expect(moduleBlock(buildStylesheet("light", { labelsBeside: true }))?.style).toMatchObject({ "text-valign": "center", "text-halign": "right" });
  });

  it("keeps edge labels horizontal only when asked (the workflow graph, UI AC-41)", () => {
    const rotations = (sheet: ReturnType<typeof buildStylesheet>) =>
      sheet.filter((b) => "selector" in b && b.selector === "edge").map((b) => (b as unknown as { style: Record<string, unknown> }).style["text-rotation"]);
    expect(rotations(buildStylesheet("light", { labelsBeside: true }))).toEqual(["autorotate"]);
    expect(rotations(buildStylesheet("light", { labelsBeside: true, levelEdgeLabels: true }))).toEqual(["autorotate", "none"]);
  });
});

describe("captionReserve", () => {
  it("is blank, at least one em wide, wider for longer names and never wider than the 150 px label width", () => {
    const short = captionReserve("pump");
    const long = captionReserve("x".repeat(200));
    expect(short.trim()).toBe("");
    expect(short.length).toBeGreaterThanOrEqual(1);
    expect(captionReserve("a much longer equipment name").length).toBeGreaterThan(short.length);
    // Em spaces at the 13 px label size: 11 of them are 143 px, inside the wrap width.
    expect(long.length * 13).toBeLessThanOrEqual(150);
    expect(long).toMatch(/^\u2003+$/);
  });
});

// SPEC-SITE-001 AC-5: the light stylesheet is unchanged; the dark one uses the dark site tokens (REQ-008, REQ-009).
describe("buildStylesheet by theme (SPEC-SITE-001)", () => {
  const blockOf = (sheet: ReturnType<typeof buildStylesheet>, selector: string) =>
    (sheet.find((b) => "selector" in b && b.selector === selector) as { style: Record<string, unknown> } | undefined)
      ?.style;

  it("defaults to the light stylesheet (SPEC-UI-001 token values)", () => {
    const light = buildStylesheet("light");
    expect(buildStylesheet()).toEqual(light);
    expect(blockOf(light, "node")).toMatchObject({ color: "#0e1116", "border-color": "#586170" });
    expect(blockOf(light, "node.boundary")).toMatchObject({ "background-color": "#f6f7f9", "border-color": "#586170" });
    expect(blockOf(light, "edge")).toMatchObject({ color: "#0e1116", "text-background-color": "#ffffff" });
    expect(blockOf(light, "node.highlighted")).toMatchObject({ "border-color": "#0e1116" });
    expect(blockOf(light, ".picked")).toMatchObject({ "overlay-color": "#4338ca" });
    expect(blockOf(light, "edge.mode-unmapped")).toBeUndefined();
  });

  it("uses dark label, border, boundary and edge-label colours in dark", () => {
    const dark = buildStylesheet("dark");
    expect(blockOf(dark, "node")).toMatchObject({ color: "#eceef2" });
    expect(blockOf(dark, "edge")).toMatchObject({ color: "#eceef2", "text-background-color": "#0b0d12" });
    expect(blockOf(dark, "node.boundary")?.["background-color"]).not.toBe("#f6f7f9");
    expect(blockOf(dark, "node.highlighted")).toMatchObject({ "border-color": "#eceef2" });
  });

  // SPEC-UI-001 UI AC-39: a workflow transfer whose mode is not specified is a neutral grey line in each theme.
  it("draws not-specified transfers in the muted colour of the theme", () => {
    expect(blockOf(buildStylesheet("light"), "edge.mode-na")).toMatchObject({ "line-color": "#586170", "target-arrow-color": "#586170" });
    expect(blockOf(buildStylesheet("dark"), "edge.mode-na")).toMatchObject({ "line-color": "#a0a8b6", "target-arrow-color": "#a0a8b6" });
  });

  it("draws unmapped connections in the dark text colour in dark", () => {
    expect(blockOf(buildStylesheet("dark"), "edge.mode-unmapped")).toMatchObject({
      "line-color": "#eceef2",
      "target-arrow-color": "#eceef2",
    });
  });
});
