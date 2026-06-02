import type { ClaimMap, EvidenceItem, PosterClaim, PosterSection } from "./poster";

export function buildClaimMap(claims: PosterClaim[], sections: PosterSection[], evidence: EvidenceItem[]): ClaimMap {
  return {
    entries: claims.map((claim) => {
      const evidenceIds = evidence
        .filter((item) => claim.source_ids.includes(item.source_id))
        .filter((item) => item.kind === "claim" || item.kind === "metric" || item.kind === "method")
        .map((item) => item.id);

      const sectionIds = sections
        .filter((section) =>
          section.blocks.some((block) => block.type === "text" && block.claim_ids?.includes(claim.id)),
        )
        .map((section) => section.id);

      return {
        claim_id: claim.id,
        claim_text: claim.text,
        source_ids: claim.source_ids,
        evidence_ids: evidenceIds,
        section_ids: sectionIds,
        confidence: claim.confidence,
      };
    }),
  };
}
