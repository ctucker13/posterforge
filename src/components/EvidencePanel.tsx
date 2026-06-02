import { BookOpen, FileSearch, Link2, MapPinned, ShieldCheck } from "lucide-react";
import type { ClaimMapEntry, PosterClaim, PosterProject } from "../domain/poster";

interface EvidencePanelProps {
  poster: PosterProject;
}

export function EvidencePanel({ poster }: EvidencePanelProps) {
  const sources = new Map(poster.sources.map((source) => [source.id, source]));
  const evidence = new Map((poster.evidence ?? []).map((item) => [item.id, item]));
  const claimEntries = poster.claimMap?.entries ?? poster.claims.map((claim) => toFallbackEntry(claim));
  const claimLocations = buildClaimLocations(poster);

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
                <div className="source-summary-heading">
                  <strong>{sources.get(summary.source_id)?.title ?? summary.source_id}</strong>
                  <span>{formatSourceBadge(sources.get(summary.source_id))}</span>
                </div>
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
                <div className="claim-map-heading">
                  <strong>{entry.claim_text}</strong>
                  <span>
                    <ShieldCheck size={13} />
                    {entry.confidence ?? "unscored"}
                  </span>
                </div>
                <div className="claim-map-meta">
                  <span>
                    <Link2 size={13} />
                    {entry.source_ids.map((sourceId) => sources.get(sourceId)?.title ?? sourceId).join(", ") || "No source"}
                  </span>
                  <span>
                    <MapPinned size={13} />
                    {formatLocations(entry, claimLocations)}
                  </span>
                </div>
                <div className="evidence-chip-list">
                  {entry.evidence_ids.length > 0 ? (
                    entry.evidence_ids.map((id) => {
                      const item = evidence.get(id);
                      return (
                        <span key={id} title={item?.text ?? id}>
                          {item ? `${item.kind}: ${truncate(item.text, 92)}` : id}
                        </span>
                      );
                    })
                  ) : (
                    <span>No evidence item</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function buildClaimLocations(poster: PosterProject): Map<string, string[]> {
  const locations = new Map<string, string[]>();

  for (const section of poster.sections) {
    section.blocks.forEach((block, index) => {
      if (block.type !== "text") {
        return;
      }

      for (const claimId of block.claim_ids ?? []) {
        const existing = locations.get(claimId) ?? [];
        existing.push(`${section.title} block ${index + 1}`);
        locations.set(claimId, existing);
      }
    });
  }

  return locations;
}

function formatLocations(entry: ClaimMapEntry, fallbackLocations: Map<string, string[]>): string {
  const sectionLocations = entry.section_ids.length > 0 ? entry.section_ids.map((id) => `section ${id}`) : [];
  const blockLocations = fallbackLocations.get(entry.claim_id) ?? [];
  const locations = [...new Set([...blockLocations, ...sectionLocations])];

  return locations.join(", ") || "No poster location";
}

function formatSourceBadge(source: PosterProject["sources"][number] | undefined): string {
  if (!source) {
    return "unknown source";
  }

  return `${source.type.replace(/_/g, " ")} · ${source.trust_level ?? "unscored"}`;
}

function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
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
