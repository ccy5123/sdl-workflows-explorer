// AC-3: Cytoscape elements and stylesheet (REQ-006, REQ-008, REQ-009, REQ-010).
import { describe, expect, it } from "vitest";
import { boundaryId, buildElements, buildStylesheet } from "../src/lib/graphElements";
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

  it("labels nodes with module type and name and colours them by display group", () => {
    const m1 = nodes.find((n) => n.data.id === "Test2020/P1/M1")!;
    expect(m1.data.label).toBe("software\nplanner");
    expect(m1.data.colour).toBe("#CC79A7");
    const m3 = nodes.find((n) => n.data.id === "Test2020/P1/M3")!;
    expect(m3.data.label).toBe("unmapped");
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

  it("gives every edge its transfer-mode class, label and colour", () => {
    expect(classesOf(edge("Test2020/P1/E1"))).toContain("mode-data_transfer");
    expect(edge("Test2020/P1/E1").data.label).toBe("data");
    expect(edge("Test2020/P1/E1").data.colour).toBe("#999999");
    expect(classesOf(edge("Test2020/P1/E2"))).toContain("mode-human_transfer");
    expect(edge("Test2020/P1/E2").data.label).toBe("human");
    expect(classesOf(edge("Test2020/P1/E3"))).toContain("mode-fixed_tubing");
    expect(edge("Test2020/P1/E3").data.label).toBe("tubing ?");
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
});
