// AC-5: evidence formatting and null display (REQ-014, REQ-015).
import { describe, expect, it } from "vitest";
import { DASH, formatEvidence, show } from "../src/lib/evidence";
import { fixturePlatform } from "./fixtures/platform";

const platform = fixturePlatform();
const DOI_URL = "https://doi.org/10.1000/test.1";

describe("show", () => {
  it("renders null, undefined and empty text as an em dash", () => {
    expect(DASH).toBe("—");
    expect(show(null)).toBe("—");
    expect(show(undefined)).toBe("—");
    expect(show("")).toBe("—");
  });

  it("renders values as text", () => {
    expect(show(0)).toBe("0");
    expect(show(15)).toBe("15");
    expect(show("robot")).toBe("robot");
  });
});

describe("formatEvidence", () => {
  it("formats a module, including its unmapped note", () => {
    expect(formatEvidence(platform, { kind: "module", id: "Test2020/P1/M3" })).toEqual({
      kind: "Module",
      id: "Test2020/P1/M3",
      doc: "SI2",
      page: "7",
      locator: "Table S1",
      note: "external NMR service",
      doiUrl: DOI_URL,
      type: { kind: "module_type", code: "unmapped" },
    });
  });

  it("renders a null page and locator as an em dash", () => {
    expect(formatEvidence(platform, { kind: "module", id: "Test2020/P1/M2" })).toMatchObject({
      page: "—",
      locator: "—",
      note: null,
    });
  });

  it("formats a connection", () => {
    expect(formatEvidence(platform, { kind: "connection", id: "Test2020/P1/E3" })).toEqual({
      kind: "Connection",
      id: "Test2020/P1/E3",
      doc: "SI1",
      page: "6",
      locator: "—",
      note: "tubing assumed",
      doiUrl: DOI_URL,
      type: { kind: "transfer_mode", code: "fixed_tubing" },
    });
  });

  it("formats a step", () => {
    expect(formatEvidence(platform, { kind: "step", id: "Test2020/P1/S1" })).toEqual({
      kind: "Step",
      id: "Test2020/P1/S1",
      doc: "SI1",
      page: "4",
      locator: "§1 ¶2",
      note: null,
      doiUrl: DOI_URL,
      type: { kind: "unit_operation", code: "react_flow" },
    });
  });

  it("formats the platform when it is selected or nothing is selected", () => {
    const expected = {
      kind: "Platform",
      id: "Test2020/P1",
      doc: "main",
      page: "3",
      locator: "Fig. 2",
      note: null,
      doiUrl: DOI_URL,
      type: null,
    };
    expect(formatEvidence(platform, null)).toEqual(expected);
    expect(formatEvidence(platform, { kind: "platform", id: "Test2020/P1" })).toEqual(expected);
  });

  it("falls back to the platform evidence for an id that is not in the platform", () => {
    expect(formatEvidence(platform, { kind: "module", id: "Nope/P1/M9" }).kind).toBe("Platform");
  });
});
