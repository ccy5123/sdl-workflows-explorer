// SPEC-SITE-001 AC-19: table borders, cell padding, header weight and section spacing come from shared custom
// properties; one shared rule right-aligns numeric cells (REQ-012). Parsed from styles.css.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(import.meta.dirname, "..", "src", "styles.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

interface Rule {
  selector: string;
  decls: [string, string][];
}

/** Every innermost rule block (also those inside @media), with its declarations. */
const rules: Rule[] = [...css.matchAll(/(?:^|\n)\s*([^\n{}@][^{}]*?)\s*\{([^{}]*)\}/g)].map((m) => ({
  selector: m[1]!.replace(/\s+/g, " ").trim(),
  decls: [...m[2]!.matchAll(/([a-z-]+)\s*:\s*([^;]+);/g)].map((d) => [d[1]!, d[2]!.trim()] as [string, string]),
}));

const TABLE = String.raw`(?:table\.data|\.counts|\.taxo-table|\.bench-table|table\.count-table|\.compare[\w-]*)`;
const CELL_SELECTOR = new RegExp(String.raw`${TABLE}[^,]*\b(th|td)\b`);
const selectors = (r: Rule) => r.selector.split(",").map((s) => s.trim());
const cellRules = rules.filter((r) => selectors(r).some((s) => CELL_SELECTOR.test(s) && !s.includes("::before")));
const thRules = cellRules.filter((r) => selectors(r).some((s) => /\bth\b/.test(s) && CELL_SELECTOR.test(s)));

describe("shared table and spacing values (AC-19)", () => {
  it("declares the shared properties on :root", () => {
    const root = rules.filter((r) => r.selector === ":root").flatMap((r) => r.decls.map(([p]) => p));
    for (const p of ["--table-border", "--cell-pad-y", "--cell-pad-x", "--th-weight", "--section-gap"]) {
      expect(root, p).toContain(p);
    }
  });

  it("finds the cell rules of every table kind", () => {
    const all = cellRules.map((r) => r.selector).join(" | ");
    // The home counts table (.counts) became stat tiles in SPEC-UI-001; the kind stays in TABLE for older markup.
    for (const kind of ["table.data", ".taxo-table", ".bench-table", "table.count-table"]) {
      expect(all, kind).toContain(kind);
    }
  });

  it("takes border colours and padding of cells from the shared properties", () => {
    const bad: string[] = [];
    for (const r of cellRules) {
      for (const [p, v] of r.decls) {
        if (/^border/.test(p)) {
          const rest = v.replace(/var\(--table-border\)/g, "").replace(/\b(1px|0|solid|none)\b/g, "").trim();
          if (rest !== "") bad.push(`${r.selector} { ${p}: ${v} }`);
        }
        if (/^padding/.test(p)) {
          const rest = v.replace(/var\(--cell-pad-[xy]\)/g, "").replace(/\b0\b/g, "").trim();
          if (rest !== "") bad.push(`${r.selector} { ${p}: ${v} }`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("takes header weight from --th-weight", () => {
    const bad = thRules.flatMap((r) =>
      r.decls.filter(([p, v]) => p === "font-weight" && v !== "var(--th-weight)").map(([p, v]) => `${r.selector} { ${p}: ${v} }`),
    );
    expect(bad).toEqual([]);
  });

  it("right-aligns numeric cells in exactly one shared .num rule with tabular figures", () => {
    const right = rules.filter((r) => r.decls.some(([p, v]) => p === "text-align" && v === "right"));
    const numRules = right.filter((r) => selectors(r).every((s) => /(^|\s|td|th)\.num$/.test(s)));
    expect(numRules).toHaveLength(1);
    expect(numRules[0]!.decls).toContainEqual(["font-variant-numeric", "tabular-nums"]);
    const otherNumericRight = right.filter((r) => r !== numRules[0] && CELL_SELECTOR.test(r.selector));
    expect(otherNumericRight.map((r) => r.selector)).toEqual([]);
  });

  it("spaces sections and h2 only with --section-gap or 0", () => {
    const bad: string[] = [];
    for (const r of rules.filter((x) => selectors(x).some((s) => /(^|\s)(section|h2)$/.test(s)))) {
      for (const [p, v] of r.decls) {
        if (!/^margin(-top|-bottom)?$/.test(p)) continue;
        const parts = v.split(/\s+(?![^(]*\))/);
        const vertical = p === "margin" ? [parts[0]!, parts[2] ?? parts[0]!] : [v];
        for (const part of vertical) if (part !== "0" && !part.includes("var(--section-gap)")) bad.push(`${r.selector} { ${p}: ${v} }`);
      }
    }
    expect(bad).toEqual([]);
  });
});
