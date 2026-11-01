// AC-1: hash route parsing (REQ-001, REQ-002).
import { describe, expect, it } from "vitest";
import { parseRoute, platformHash } from "../src/lib/route";

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
