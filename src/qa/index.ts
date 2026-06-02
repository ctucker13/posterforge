import type { PosterProject, QaIssue } from "../domain/poster";

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
  const visualIds = new Set(poster.visuals.map((visual) => visual.id));
  const referencedSourceIds = new Set<string>();

  if (poster.title.trim().length === 0) {
    issues.push({
      id: "poster_title_required",
      severity: "high",
      location: "title",
      message: "Poster must have a title.",
      suggestedFix: "Add a concise title before export.",
    });
  }

  if (poster.sources.length === 0) {
    issues.push({
      id: "poster_sources_required",
      severity: "high",
      location: "sources",
      message: "Poster must have at least one source.",
      suggestedFix: "Add a mock, local, web, paper, Confluence, or GitLab source before generation.",
    });
  }

  const hasResultsSection = poster.sections.some((section) => {
    const title = section.title.toLowerCase();
    return section.type === "results" || section.type === "key_findings" || title.includes("result") || title.includes("finding");
  });

  if (!hasResultsSection) {
    issues.push({
      id: "results_section_required",
      severity: "medium",
      location: "sections",
      message: "Poster should include at least one results or key findings section.",
      suggestedFix: "Add a results-first panel, key findings panel, or rename the relevant section so the layout can identify it.",
    });
  }

  for (const claim of poster.claims) {
    if (claim.source_ids.length === 0) {
      issues.push({
        id: "claims_require_sources",
        severity: "high",
        location: `claims.${claim.id}`,
        message: "Claim has no source reference.",
        suggestedFix: "Link this claim to a parsed source, or move it into a clearly marked draft note.",
      });
    }

    for (const sourceId of claim.source_ids) {
      referencedSourceIds.add(sourceId);
      if (!sourceIds.has(sourceId)) {
        issues.push({
          id: "unsupported_claim",
          severity: "high",
          location: `claims.${claim.id}`,
          message: `Claim references unknown source '${sourceId}'.`,
          suggestedFix: "Replace the source id with one from the source bundle, or add the missing source before export.",
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
        suggestedFix: "Attach the dataset, paper, notebook, or project evidence that produced this visual.",
      });
    }

    for (const sourceId of sourceIdsForVisual) {
      referencedSourceIds.add(sourceId);
      if (!sourceIds.has(sourceId)) {
        issues.push({
          id: "visual_unknown_source",
          severity: "high",
          location: `visuals.${visual.id}`,
          message: `Visual references unknown source '${sourceId}'.`,
          suggestedFix: "Add the missing source record or point the visual at an existing source id.",
        });
      }
    }

    if (visual.type === "ai_image" && sourceIdsForVisual.length > 0) {
      issues.push({
        id: "ai_images_not_factual",
        severity: "high",
        location: `visuals.${visual.id}`,
        message: "AI-generated image is linked as evidence.",
        suggestedFix: "Keep AI images for atmosphere or section art, and cite factual claims through deterministic visuals or source text.",
      });
    }

    const width = Number(visual.asset?.width_px);
    const height = Number(visual.asset?.height_px);
    if (visual.type === "ai_image" && Number.isFinite(width) && Number.isFinite(height) && (width < 1600 || height < 1000)) {
      issues.push({
        id: "low_image_resolution",
        severity: "medium",
        location: `visuals.${visual.id}`,
        message: "Generated image asset may be too low resolution for print.",
        suggestedFix: "Regenerate or upscale this asset before PPTX/PDF export.",
      });
    }

    if (["sankey", "timeline", "gantt", "plotly_generic"].includes(visual.type)) {
      const hasLabelPlan = Boolean(visual.options?.label_strategy ?? visual.options?.labelStrategy);
      if (!hasLabelPlan) {
        issues.push({
          id: "chart_label_readability",
          severity: "low",
          location: `visuals.${visual.id}`,
          message: "Chart has no label readability strategy recorded.",
          suggestedFix: "Add label wrapping, truncation, or annotation rules before export render checks.",
        });
      }
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
          suggestedFix: "Shorten this block into a finding, method point, or caption-sized summary.",
        });
      }

      if (block.type === "visual_ref" && !visualIds.has(block.visual_id)) {
        issues.push({
          id: "visual_ref_missing",
          severity: "high",
          location: `sections.${section.id}.blocks`,
          message: `Block references missing visual '${block.visual_id}'.`,
          suggestedFix: "Add the visual to the poster spec or update the block to reference an existing visual id.",
        });
      }
    }
  }

  if (poster.sources.length > 0 && (poster.references?.length ?? 0) === 0) {
    issues.push({
      id: "missing_references",
      severity: "medium",
      location: "references",
      message: "Poster has sources but no references output.",
      suggestedFix: "Generate reference records from the source bundle before export.",
      autoFixable: true,
      fixId: "create_references",
    });
  }

  if (poster.sections.length === 0 || poster.visuals.length === 0 || poster.sources.length === 0) {
    issues.push({
      id: "export_completeness",
      severity: "high",
      location: "poster",
      message: "Poster spec is missing required content for export readiness.",
      suggestedFix: "Generate or import a complete poster spec with sections, visuals, sources, and claims.",
    });
  }

  if (poster.palette === "natwest-group" && poster.theme !== "natwest-group") {
    issues.push({
      id: "theme_palette_scope",
      severity: "low",
      location: "palette",
      message: "NatWest palette is explicitly applied to a non-NatWest theme.",
      suggestedFix: "This is allowed as an explicit override; verify the palette choice before exporting externally.",
    });
  }

  if (referencedSourceIds.size === 0 && poster.claims.length > 0) {
    issues.push({
      id: "missing_source_links",
      severity: "high",
      location: "sources",
      message: "No poster claims or visuals are linked to sources.",
      suggestedFix: "Run evidence extraction or manually connect claims and visuals to source ids.",
    });
  }

  return issues;
}

export function applyQaFix(poster: PosterProject, fixId: NonNullable<QaIssue["fixId"]>): PosterProject {
  if (fixId === "create_references") {
    return {
      ...poster,
      references: poster.sources.map((source) => ({
        id: source.id,
        title: source.title,
        type: source.type,
        url: source.url,
        accessed_at: source.accessed_at,
      })),
    };
  }

  return poster;
}
