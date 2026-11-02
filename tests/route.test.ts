// AC-1: hash route parsing (REQ-001, REQ-002).
import { describe, expect, it } from "vitest";
import {
  compareHash,
  navCurrent,
  parseRoute,
  platformHash,
  routeTitle,
  taxonomyHash,
  taxonomySourceHash,
} from "../src/lib/route";

describe("parseRoute", () => {
  it("parses a complete platform route", () => {
    expect(parseRoute("#/platform/Aand2024/P1")).toEqual({
      kind: "platform",
      paperId: "Aand2024",
      platformId: "Aand2024/P1",
    });
  });

  it.each(["", "#", "#/"])("treats %j as home", (hash) => {
    expect(parseRoute(hash)).toEqual({ kind: "home" });
  });

  it.each(["#/platform/", "#/platform/Aand2024", "#/nonsense", "#/platform/Aand2024/P1/extra", "#/platform//P1"])(
    "treats %j as not found, carrying the hash",
    (hash) => {
      expect(parseRoute(hash)).toEqual({ kind: "notFound", hash });
    },
  );

  it("does not throw on malformed percent-encoding", () => {
    expect(() => parseRoute("#/platform/%E0%A4%A/P1")).not.toThrow();
    expect(parseRoute("#/platform/%E0%A4%A/P1").kind).toBe("notFound");
  });

  it("decodes percent-encoded segments", () => {
    expect(parseRoute("#/platform/Aand%202024/P1")).toEqual({
      kind: "platform",
      paperId: "Aand 2024",
      platformId: "Aand 2024/P1",
    });
  });
});

describe("platformHash", () => {
  it("builds the hash URL of a platform id and round-trips through parseRoute", () => {
    expect(platformHash("Aand2024/P1")).toBe("#/platform/Aand2024/P1");
    expect(parseRoute(platformHash("Aand2024/P1"))).toMatchObject({ platformId: "Aand2024/P1" });
  });
});

// SPEC-BROWSE-001 AC-1: browse and compare routes (REQ-001).
describe("parseRoute: browse and compare", () => {
  it.each([
    ["#/browse", ""],
    ["#/browse?", ""],
    ["#/browse?view=platforms&q=x", "view=platforms&q=x"],
  ])("parses %j as browse with query %j", (hash, query) => {
    expect(parseRoute(hash)).toEqual({ kind: "browse", query });
  });

  it.each<[string, string[]]>([
    ["#/compare/Aand2024/P1,Li2020/P1", ["Aand2024/P1", "Li2020/P1"]],
    ["#/compare/", []],
    ["#/compare/Aand%202024/P1,Zed", ["Aand 2024/P1", "Zed"]],
    ["#/compare/%E0%A4%A/P1,Li2020/P1", ["%E0%A4%A/P1", "Li2020/P1"]],
    ["#/compare/A%2CB/P1,C/P2", ["A,B/P1", "C/P2"]],
    ["#/compare/A//P1,/P1", ["A//P1", "/P1"]],
  ])("parses %j as compare with ids %j", (hash, ids) => {
    expect(() => parseRoute(hash)).not.toThrow();
    expect(parseRoute(hash)).toEqual({ kind: "compare", ids });
  });

  it.each(["#/browse/", "#/browse/x", "#/browsex", "#/compare"])("treats %j as not found", (hash) => {
    expect(parseRoute(hash)).toEqual({ kind: "notFound", hash });
  });
});

describe("compareHash", () => {
  it("joins encoded ids with commas and round-trips through parseRoute", () => {
    expect(compareHash(["Aand2024/P1", "Li2020/P1"])).toBe("#/compare/Aand2024/P1,Li2020/P1");
    expect(parseRoute(compareHash(["Aand2024/P1", "Li2020/P1"]))).toEqual({ kind: "compare", ids: ["Aand2024/P1", "Li2020/P1"] });
    expect(compareHash(["A,B/P1", "C D/P2"])).toBe("#/compare/A%2CB/P1,C%20D/P2");
    expect(parseRoute(compareHash(["A,B/P1", "C D/P2"]))).toEqual({ kind: "compare", ids: ["A,B/P1", "C D/P2"] });
  });
});

// SPEC-TRENDS-001 AC-1: the trends route (REQ-001).
describe("parseRoute: trends", () => {
  it.each([
    ["#/trends", ""],
    ["#/trends?", ""],
    ["#/trends?split=mt&view=platforms", "split=mt&view=platforms"],
  ])("parses %j as trends with query %j", (hash, query) => {
    expect(() => parseRoute(hash)).not.toThrow();
    expect(parseRoute(hash)).toEqual({ kind: "trends", query });
  });

  it.each(["#/trends/", "#/trends/x", "#/trendsx"])("treats %j as not found, carrying the hash", (hash) => {
    expect(() => parseRoute(hash)).not.toThrow();
    expect(parseRoute(hash)).toEqual({ kind: "notFound", hash });
  });
});

describe("parseRoute: taxonomy (SPEC-TAXO-001 AC-9)", () => {
  it("parses the overview and well-formed class pages", () => {
    expect(parseRoute("#/taxonomy")).toEqual({ kind: "taxonomy" });
    expect(parseRoute("#/taxonomy/module_type/flow_reactor")).toEqual({ kind: "taxonomyClass", classKind: "module_type", cls: "flow_reactor" });
    expect(parseRoute("#/taxonomy/a%20b/c")).toEqual({ kind: "taxonomyClass", classKind: "a b", cls: "c" });
    expect(parseRoute("#/taxonomy/x/y")).toEqual({ kind: "taxonomyClass", classKind: "x", cls: "y" });
  });

  it.each(["#/taxonomy/", "#/taxonomy/x", "#/taxonomy/a/b/c", "#/taxonomy/a/", "#/taxonomy//b", "#/taxonomy/a/%E0", "#/taxonomy?x", "#/taxonomyx"])(
    "treats %j as not found, carrying the hash",
    (hash) => {
      expect(() => parseRoute(hash)).not.toThrow();
      expect(parseRoute(hash)).toEqual({ kind: "notFound", hash });
    },
  );

  it("builds class hashes that parse back", () => {
    expect(taxonomyHash("unit_operation", "sonicate")).toBe("#/taxonomy/unit_operation/sonicate");
    expect(taxonomyHash("a b", "c/d")).toBe("#/taxonomy/a%20b/c%2Fd");
    expect(parseRoute(taxonomyHash("a b", "c/d"))).toEqual({ kind: "taxonomyClass", classKind: "a b", cls: "c/d" });
  });
});

describe("parseRoute: taxonomy source target (SPEC-TAXO-001 0.4.0 AC-9)", () => {
  it.each([
    ["#/taxonomy?source=Mehr2020", "Mehr2020"],
    ["#/taxonomy?source=a%20b", "a b"],
    ["#/taxonomy?source=Nobody2020", "Nobody2020"],
  ])("parses %j as the overview with target source %j", (hash, source) => {
    expect(parseRoute(hash)).toEqual({ kind: "taxonomy", source });
  });

  it("keeps the overview without a source key when no target is given", () => {
    expect(Object.keys(parseRoute("#/taxonomy"))).toEqual(["kind"]);
  });

  it.each([
    "#/taxonomy?",
    "#/taxonomy?source=",
    "#/taxonomy?source=%E0",
    "#/taxonomy?source=Mehr2020&x=1",
    "#/taxonomy?source=Mehr2020&",
    "#/taxonomy?sources=Mehr2020",
    "#/taxonomy?x=1&source=Mehr2020",
  ])("treats %j as not found, carrying the hash", (hash) => {
    expect(() => parseRoute(hash)).not.toThrow();
    expect(parseRoute(hash)).toEqual({ kind: "notFound", hash });
  });

  it("builds source hashes that parse back", () => {
    expect(taxonomySourceHash("Bai2024")).toBe("#/taxonomy?source=Bai2024");
    expect(taxonomySourceHash("a b&c")).toBe("#/taxonomy?source=a%20b%26c");
    expect(parseRoute(taxonomySourceHash("a b&c"))).toEqual({ kind: "taxonomy", source: "a b&c" });
  });
});

// SPEC-BENCH-001 AC-5: the benchmark page and the item explorer (REQ-005).
describe("parseRoute: benchmark (SPEC-BENCH-001 AC-5)", () => {
  it("parses the benchmark page and the explorer with its query text", () => {
    expect(parseRoute("#/benchmark")).toEqual({ kind: "benchmark" });
    expect(parseRoute("#/benchmark/items")).toEqual({ kind: "benchmarkItems", query: "" });
    expect(parseRoute("#/benchmark/items?task=x")).toEqual({ kind: "benchmarkItems", query: "task=x" });
    expect(parseRoute("#/benchmark/items?")).toEqual({ kind: "benchmarkItems", query: "" });
    expect(parseRoute("#/benchmark/items?task=a%2Fb&split=test")).toEqual({ kind: "benchmarkItems", query: "task=a%2Fb&split=test" });
  });

  it.each(["#/benchmark/x", "#/benchmark?x", "#/benchmarks", "#/benchmark/items/x", "#/benchmark/", "#/benchmarkitems"])(
    "treats %j as not found, carrying the hash",
    (hash) => {
      expect(parseRoute(hash)).toEqual({ kind: "notFound", hash });
    },
  );
});

// SPEC-SITE-001 REQ-010: document title and current nav link per route.
describe("routeTitle and navCurrent (SPEC-SITE-001)", () => {
  it.each([
    ["#/", "Home", "Home"],
    ["#/about", "About", "About"],
    ["#/platform/Aand2024/P1", "Platform Aand2024/P1", null],
    ["#/browse?view=platforms", "Browse", "Browse"],
    ["#/compare/Aand2024/P1,Li2020/P1", "Compare", null],
    ["#/trends", "Trends", "Trends"],
    ["#/taxonomy", "Taxonomy", "Taxonomy"],
    ["#/taxonomy/module_type/flow_reactor", "Taxonomy: flow_reactor", "Taxonomy"],
    ["#/benchmark", "Benchmark", "Benchmark"],
    ["#/benchmark/items?task=x", "Benchmark items", "Benchmark"],
    ["#/nope", "Not found", null],
  ])("%s → %s, current %s", (hash, title, current) => {
    const route = parseRoute(hash);
    expect(routeTitle(route)).toBe(title);
    expect(navCurrent(route)).toBe(current);
  });
});

// SPEC-SITE-001 REQ-005: the about page.
describe("parseRoute: about (SPEC-SITE-001)", () => {
  it("parses the about page", () => {
    expect(parseRoute("#/about")).toEqual({ kind: "about" });
  });

  it.each(["#/about/", "#/about?x", "#/abouts", "#/about/x"])("treats %j as not found, carrying the hash", (hash) => {
    expect(parseRoute(hash)).toEqual({ kind: "notFound", hash });
  });
});
