// AC-6: one link per platform of a paper sharing the identity (REQ-005).
import { describe, expect, it } from "vitest";
import type { PlatformRow } from "../src/data/types";
import { sharedIdentityLinks } from "../src/lib/identity";
import { dataAvailable, readIndex, warnIfMissing } from "./viewer-data";

warnIfMissing("identity.test.ts");

const row = (platform_id: string, identity_id: string, platform_name: string | null = null): PlatformRow => ({
  platform_id,
  paper_id: platform_id.split("/")[0]!,
  platform_name,
  first_public_year: 2020,
  field_tags: [],
  commercial_integrated: false,
  identity_id,
  n_modules: 1,
  n_steps: 1,
  module_types: [],
  material_transfer_modes: [],
});

describe("sharedIdentityLinks", () => {
  it("links every matching platform of each shared paper and lists a paper without a match unlinked", () => {
    const rows = [row("A/P1", "I1"), row("B/P1", "I1", "beta one"), row("B/P2", "I1"), row("B/P3", "I9"), row("C/P1", "I2")];
    expect(sharedIdentityLinks({ identity_id: "I1", shared_with: ["B", "C"] }, rows)).toEqual([
      {
        paperId: "B",
        platforms: [
          { platformId: "B/P1", label: "B/P1 (beta one)" },
          { platformId: "B/P2", label: "B/P2" },
        ],
      },
      { paperId: "C", platforms: [] },
    ]);
  });

  it("returns nothing when shared_with is empty", () => {
    expect(sharedIdentityLinks({ identity_id: "I1", shared_with: [] }, [row("A/P1", "I1")])).toEqual([]);
  });
});

describe.skipIf(!dataAvailable)("real index.json", () => {
  it("CortesBorda2018/P1 lists two links for Wimmer2019", () => {
    const index = readIndex();
    const self = index.platforms.find((p) => p.platform_id === "CortesBorda2018/P1")!;
    const links = sharedIdentityLinks(
      { identity_id: self.identity_id, shared_with: ["Aka2019", "Konan2022", "Vasudevan2021", "Wimmer2019"] },
      index.platforms,
    );
    const wimmer = links.find((l) => l.paperId === "Wimmer2019")!;
    expect(wimmer.platforms.map((p) => p.platformId)).toEqual(["Wimmer2019/P1", "Wimmer2019/P2"]);
  });
});
