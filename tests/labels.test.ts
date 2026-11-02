// SPEC-UI-001 AC-3: readable names for vocabulary codes (REQ-007, REQ-009). The real-data case reads public/data/
// and skips with a message when build-data has not run.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { TaxonomyJson } from "../src/data/types";
import { displayLabel, sentenceCase } from "../src/lib/labels";

describe("displayLabel", () => {
  it.each([
    ["field_tag", "chemistry_synthesis", "Chemistry synthesis"],
    ["module_type", "instrument_separation_ms", "Separation / MS instrument"],
    ["field_tag", "biology_biochem", "Biology and biochemistry"],
    ["module_type", "flow_reactor", "Flow reactor"],
    ["unit_operation", "measure_optical", "Optical measurement"],
    ["unit_operation", "react_photo_electro", "Photo/electro reaction"],
    ["transfer_mode", "fixed_tubing", "Fixed tubing"],
    ["field_tag", "unmapped", "Other field (unmapped)"],
    ["somewhere_new", "foo_bar_baz", "Foo bar baz"],
  ])("%s %s → %s", (kind, code, label) => {
    expect(displayLabel(kind, code)).toBe(label);
  });

  it("derives sentence case from a code", () => {
    expect(sentenceCase("chemistry_synthesis")).toBe("Chemistry synthesis");
    expect(sentenceCase("x")).toBe("X");
    expect(sentenceCase("")).toBe("");
  });
});

const PATH = join("public", "data", "taxonomy.json");
const built = existsSync(PATH);

describe.skipIf(!built)("labels of the pinned release's taxonomy (AC-3)", () => {
  if (!built) console.warn("taxonomy.json absent: run `npm run build-data` for the real-data cases");
  const classes = built ? (JSON.parse(readFileSync(PATH, "utf8")) as TaxonomyJson).classes : [];

  it("gives every class a label that differs from its code", () => {
    expect(classes.length).toBeGreaterThan(0);
    for (const c of classes) {
      const label = displayLabel(c.class_kind, c.class);
      expect(label, `${c.class_kind}/${c.class}`).not.toBe("");
      expect(label, `${c.class_kind}/${c.class}`).not.toBe(c.class);
    }
  });

  it("gives no two classes the same label, across all kinds", () => {
    const seen = new Map<string, string>();
    const clashes: string[] = [];
    for (const c of classes) {
      const label = displayLabel(c.class_kind, c.class);
      const other = seen.get(label);
      if (other) clashes.push(`${label}: ${other} and ${c.class_kind}/${c.class}`);
      seen.set(label, `${c.class_kind}/${c.class}`);
    }
    expect(clashes).toEqual([]);
  });
});
