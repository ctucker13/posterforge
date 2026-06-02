import { describe, expect, it } from "vitest";
import type { EvidenceItem, PosterClaim, PosterSection } from "./poster";
import { buildClaimMap } from "./evidence";

describe("buildClaimMap", () => {
  it("links claims to evidence and poster sections", () => {
    const claims: PosterClaim[] = [
      {
        id: "claim_1",
        text: "Calibration is tracked separately.",
        source_ids: ["src_paper"],
        confidence: "medium",
      },
    ];
    const sections: PosterSection[] = [
      {
        id: "technical_note",
        type: "methods",
        title: "Technical note",
        blocks: [{ type: "text", text: "Calibration summary", claim_ids: ["claim_1"] }],
      },
    ];
    const evidence: EvidenceItem[] = [
      {
        id: "ev_1",
        source_id: "src_paper",
        kind: "claim",
        text: "Calibration monitoring is separate from raw performance.",
      },
      {
        id: "ev_2",
        source_id: "src_other",
        kind: "claim",
        text: "Unrelated source evidence.",
      },
    ];

    const claimMap = buildClaimMap(claims, sections, evidence);

    expect(claimMap.entries).toEqual([
      {
        claim_id: "claim_1",
        claim_text: "Calibration is tracked separately.",
        source_ids: ["src_paper"],
        evidence_ids: ["ev_1"],
        section_ids: ["technical_note"],
        confidence: "medium",
      },
    ]);
  });
});
