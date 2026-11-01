// AC-1: hash route parsing (REQ-001, REQ-002).
import { describe, expect, it } from "vitest";
import { compareHash, parseRoute, platformHash, taxonomyHash } from "../src/lib/route";

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
