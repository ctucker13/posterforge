import { BookOpen, FileSearch, Link2 } from "lucide-react";
import type { ClaimMapEntry, PosterClaim, PosterProject } from "../domain/poster";

interface EvidencePanelProps {
  poster: PosterProject;
}

export function EvidencePanel({ poster }: EvidencePanelProps) {
  const sources = new Map(poster.sources.map((source) => [source.id, source]));
  const evidence = new Map((poster.evidence ?? []).map((item) => [item.id, item]));
  const claimEntries = poster.claimMap?.entries ?? poster.claims.map((claim) => toFallbackEntry(claim));

  return (
    <section className="evidence-panel tool-panel" aria-label="Evidence and claim map">
      <div className="panel-header">
        <h2>Evidence</h2>
        <span>{poster.evidence?.length ?? 0} items</span>
      </div>

      <div className="evidence-body">
        <section className="source-summary-section" aria-label="Source summaries">
          <h3>
            <BookOpen size={16} /> Source summaries
          </h3>
          <div className="source-summary-list">
            {(poster.sourceSummaries ?? []).map((summary) => (
              <article key={summary.source_id}>
                <strong>{sources.get(summary.source_id)?.title ?? summary.source_id}</strong>
                <p>{summary.summary}</p>
                <span>{summary.metrics?.join(", ") || summary.methods?.join(", ") || "structured source"}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="claim-map-section" aria-label="Claim map">
          <h3>
            <FileSearch size={16} /> Claim map
          </h3>
          <div className="claim-map-list">
            {claimEntries.map((entry) => (
              <article key={entry.claim_id}>
                <strong>{entry.claim_text}</strong>
                <div className="claim-map-meta">
                  <span>
                    <Link2 size={13} />
                    {entry.source_ids.map((sourceId) => sources.get(sourceId)?.title ?? sourceId).join(", ") || "No source"}
                  </span>
                  <span>{entry.evidence_ids.map((id) => evidence.get(id)?.kind ?? id).join(", ") || "No evidence item"}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function toFallbackEntry(claim: PosterClaim): ClaimMapEntry {
  return {
    claim_id: claim.id,
    claim_text: claim.text,
    source_ids: claim.source_ids,
    evidence_ids: [],
    section_ids: [],
    confidence: claim.confidence,
  };
}
