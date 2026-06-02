import type { PosterAsset, PosterProject, QaIssue } from "../domain/poster";

const factualVisualTypes = new Set([
  "table",
  "plotly_generic",
  "confusion_matrix",
  "roc_curve",
  "precision_recall_curve",
  "calibration_plot",
  "lift_gains_chart",
  "feature_importance",
  "shap_summary",
  "shap_waterfall",
  "pdp_ice",
  "sankey",
  "alluvial",
  "funnel",
  "timeline",
  "gantt",
  "mermaid_flow",
  "math",
  "code_block",
  "metric_card",
  "missingness_matrix",
  "null_heatmap",
  "schema_drift",
  "outlier_plot",
]);

const generatedVisualTypes = new Set(["ai_image", "generated_background", "generated_comic_panel"]);
const generatedAssetTypes = new Set<PosterAsset["type"]>(["ai_image", "generated_background", "generated_panel"]);

function hasText(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function collectGeneratedAssets(poster: PosterProject): Array<{ asset: PosterAsset; location: string }> {
  const assets: Array<{ asset: PosterAsset; location: string }> = [];

  for (const asset of poster.assets ?? []) {
    if (generatedAssetTypes.has(asset.type)) {
      assets.push({ asset, location: `assets.${asset.id}` });
    }
  }

  for (const visual of poster.visuals) {
    if (visual.asset && (generatedVisualTypes.has(visual.type) || generatedAssetTypes.has(visual.asset.type))) {
      assets.push({ asset: visual.asset, location: `visuals.${visual.id}.asset` });
    }
  }

  return assets;
}

export function runQa(poster: PosterProject): QaIssue[] {
  const issues: QaIssue[] = [];
  const sourceIds = new Set(poster.sources.map((source) => source.id));
  const sourceDocumentIds = new Set((poster.sourceDocuments ?? []).map((document) => document.source.id));
  const sourceSummaryIds = new Set((poster.sourceSummaries ?? []).map((summary) => summary.source_id));
  const evidenceSourceIds = new Set((poster.evidence ?? []).map((evidence) => evidence.source_id));
  const visualIds = new Set(poster.visuals.map((visual) => visual.id));
  const claimIds = new Set(poster.claims.map((claim) => claim.id));
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

  for (const source of poster.sources) {
    if (!sourceDocumentIds.has(source.id)) {
      issues.push({
        id: "source_document_missing",
        severity: "medium",
        location: `sources.${source.id}`,
        message: "Source has no parsed document artifact.",
        suggestedFix: "Fetch or parse this source into a SourceDocument before relying on it for generation.",
      });
    }

    if (!sourceSummaryIds.has(source.id)) {
      issues.push({
        id: "source_summary_missing",
        severity: "medium",
        location: `sources.${source.id}`,
        message: "Source has no extracted summary.",
        suggestedFix: "Run source interpretation so the poster can separate methods, metrics, figures, and claims.",
      });
    }

    if (!evidenceSourceIds.has(source.id)) {
      issues.push({
        id: "source_evidence_missing",
        severity: "medium",
        location: `sources.${source.id}`,
        message: "Source has no evidence items linked to it.",
        suggestedFix: "Extract claim, method, metric, figure, or reference evidence from this source.",
      });
    }
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

    if (generatedVisualTypes.has(visual.type) && sourceIdsForVisual.length > 0) {
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
    if (generatedVisualTypes.has(visual.type) && Number.isFinite(width) && Number.isFinite(height) && (width < 1600 || height < 1000)) {
      issues.push({
        id: "low_image_resolution",
        severity: "medium",
        location: `visuals.${visual.id}`,
        message: "Generated image asset may be too low resolution for print.",
        suggestedFix: "Regenerate or upscale this asset before PPTX/PDF export.",
      });
    }

    if (["sankey", "alluvial", "funnel", "timeline", "gantt", "plotly_generic"].includes(visual.type)) {
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

  for (const { asset, location } of collectGeneratedAssets(poster)) {
    if (!hasText(asset.prompt)) {
      issues.push({
        id: "generated_asset_prompt_missing",
        severity: "medium",
        location,
        message: "Generated asset is missing the prompt metadata.",
        suggestedFix: "Record the image-generation prompt so the asset can be audited or regenerated.",
      });
    }

    if (!hasText(asset.model)) {
      issues.push({
        id: "generated_asset_model_missing",
        severity: "medium",
        location,
        message: "Generated asset is missing the model metadata.",
        suggestedFix: "Record the image model used for this generated asset.",
      });
    }
  }

  for (const section of poster.sections) {
    for (const [index, block] of section.blocks.entries()) {
      if (block.type === "text" && block.text.length > 420) {
        issues.push({
          id: "poster_text_density",
          severity: "medium",
          location: `sections.${section.id}.blocks.${index}`,
          message: "Text block is long for a poster panel.",
          suggestedFix: "Shorten this block into a finding, method point, or caption-sized summary.",
        });
      }

      if (block.type === "text" && block.text.length > 280) {
        issues.push({
          id: "text_overflow_risk",
          severity: "low",
          location: `sections.${section.id}.blocks.${index}`,
          message: "Text block may overflow or crowd a poster panel.",
          suggestedFix: "Reduce this text to one concise finding, or move supporting detail into source notes.",
        });
      }

      if (block.type === "text" && block.text.trim().length > 0 && (block.claim_ids?.length ?? 0) === 0) {
        issues.push({
          id: "text_block_claim_links",
          severity: "medium",
          location: `sections.${section.id}.blocks.${index}`,
          message: "Text block has no claim links.",
          suggestedFix: "Link this block to one or more PosterClaim IDs so preview and exports can show source grounding.",
        });
      }

      for (const claimId of block.type === "text" ? block.claim_ids ?? [] : []) {
        if (!claimIds.has(claimId)) {
          issues.push({
            id: "text_block_unknown_claim",
            severity: "high",
            location: `sections.${section.id}.blocks.${index}`,
            message: `Text block references unknown claim '${claimId}'.`,
            suggestedFix: "Add the missing claim or update the block to point at an existing PosterClaim ID.",
          });
        }
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

  const jsonMissingParts = [
    !hasText(poster.id) ? "poster id" : "",
    !hasText(poster.title) ? "title" : "",
    poster.sections.length === 0 ? "sections" : "",
    poster.sources.length === 0 ? "sources" : "",
    poster.claims.length === 0 ? "claims" : "",
    poster.visuals.length === 0 ? "visuals" : "",
    (poster.traces?.length ?? 0) === 0 ? "trace events" : "",
    poster.qaResults === undefined ? "QA results field" : "",
  ].filter(Boolean);

  if (jsonMissingParts.length > 0) {
    issues.push({
      id: "export_target_readiness",
      severity: "medium",
      location: "exports.poster_json",
      message: `Poster JSON export is missing ${jsonMissingParts.join(", ")}.`,
      suggestedFix: "Complete the PosterProject source-of-truth fields before exporting poster.json.",
    });
  }

  const bundleMissingParts = [
    (poster.sourceDocuments?.length ?? 0) === 0 ? "source documents" : "",
    (poster.sourceSummaries?.length ?? 0) === 0 ? "source summaries" : "",
    (poster.evidence?.length ?? 0) === 0 ? "evidence items" : "",
    (poster.claimMap?.entries.length ?? 0) === 0 ? "claim map" : "",
    poster.sources.length > 0 && (poster.references?.length ?? 0) === 0 ? "references" : "",
    (poster.assets?.length ?? 0) === 0 && !poster.visuals.some((visual) => visual.asset) ? "asset metadata" : "",
    (poster.traces?.length ?? 0) === 0 ? "trace log" : "",
  ].filter(Boolean);

  if (bundleMissingParts.length > 0) {
    issues.push({
      id: "export_target_readiness",
      severity: "medium",
      location: "exports.project_bundle",
      message: `Project bundle export is missing ${bundleMissingParts.join(", ")}.`,
      suggestedFix: "Keep parsed sources, evidence, claim map, asset metadata, traces, QA, and references with the project bundle.",
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
