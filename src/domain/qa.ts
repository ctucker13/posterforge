import type { PosterProject, QaIssue } from "./poster";

const factualVisualTypes = new Set([
  "table",
  "plotly_generic",
  "confusion_matrix",
  "roc_curve",
  "precision_recall_curve",
  "calibration_plot",
  "feature_importance",
  "shap_summary",
  "sankey",
  "timeline",
  "gantt",
  "mermaid_flow",
  "math",
  "code_block",
]);

export function runQa(poster: PosterProject): QaIssue[] {
  const issues: QaIssue[] = [];
  const sourceIds = new Set(poster.sources.map((source) => source.id));

  for (const claim of poster.claims) {
    if (claim.source_ids.length === 0) {
      issues.push({
        id: "claims_require_sources",
        severity: "high",
        location: `claims.${claim.id}`,
        message: "Claim has no source reference.",
      });
    }

    for (const sourceId of claim.source_ids) {
      if (!sourceIds.has(sourceId)) {
        issues.push({
          id: "claim_unknown_source",
          severity: "high",
          location: `claims.${claim.id}`,
          message: `Claim references unknown source '${sourceId}'.`,
        });
      }
    }
  }

  for (const visual of poster.visuals) {
    const sourceIdsForVisual = visual.source_ids ?? [];
    if (factualVisualTypes.has(visual.type) && sourceIdsForVisual.length === 0) {
      issues.push({
        id: "visual_source_traceability",
        severity: "high",
        location: `visuals.${visual.id}`,
        message: "Factual visual needs a source reference.",
      });
    }
  }

  for (const section of poster.sections) {
    for (const block of section.blocks) {
      if (block.type === "text" && block.text.length > 420) {
        issues.push({
          id: "poster_text_density",
          severity: "medium",
          location: `sections.${section.id}`,
          message: "Text block is long for a poster panel.",
        });
      }
    }
  }

  return issues;
}
