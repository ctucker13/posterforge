import type { PosterProject } from "../domain/poster";
import { buildHtmlPreviewArtifact } from "./htmlPreview";
import type { ExportArtifact, ExportManifest, ExportTarget } from "./model";
export type { ExportArtifact, ExportArtifactStatus, ExportJob, ExportManifest, ExportTarget } from "./model";

export interface ExportCapability {
  id: ExportTarget;
  label: string;
  status: "available" | "planned";
  description: string;
  output: string;
  requirements: string[];
}

export const exportCapabilities: ExportCapability[] = [
  {
    id: "poster_json",
    label: "Export poster JSON",
    status: "available",
    description: "Downloads the current PosterProject source-of-truth spec.",
    output: "poster.json",
    requirements: ["valid PosterProject state", "browser download"],
  },
  {
    id: "pptx",
    label: "Export editable PPTX",
    status: "planned",
    description: "Editable PowerPoint export with native text, shapes, and image fallbacks.",
    output: "poster.pptx",
    requirements: ["PptxGenJS", "layout-to-slide compiler", "visual SVG/PNG fallbacks"],
  },
  {
    id: "pdf",
    label: "Export print PDF",
    status: "planned",
    description: "Print-ready PDF rendered from the HTML preview with export QA checks.",
    output: "poster.pdf",
    requirements: ["Playwright", "print viewport", "overflow and clipping checks"],
  },
  {
    id: "png",
    label: "Export preview PNG",
    status: "planned",
    description: "Raster preview for sharing, QA snapshots, and project bundles.",
    output: "poster-preview.png",
    requirements: ["Playwright screenshot", "canvas/image readiness checks"],
  },
  {
    id: "project_bundle",
    label: "Export project bundle",
    status: "available",
    description: "Downloads a manifest for the future ZIP bundle containing spec, sources, assets, traces, QA, and exports.",
    output: "posterforge-bundle-manifest.json",
    requirements: ["valid PosterProject state", "bundle manifest"],
  },
];

export function downloadPosterJson(poster: PosterProject) {
  downloadJson(`${poster.id || "poster"}.json`, poster);
}

export function buildProjectBundleManifest(poster: PosterProject, createdAt = new Date().toISOString()): ExportManifest {
  return {
    id: `${poster.id || "poster"}_bundle_manifest`,
    posterId: poster.id,
    createdAt,
    schemaVersion: "posterforge.bundle.v0",
    artifacts: [
      buildArtifact("poster_json", "poster_json", "poster_spec", "poster.json", "application/json", "Poster project JSON"),
      buildHtmlPreviewArtifact(poster, createdAt),
      buildArtifact("source_documents", "project_bundle", "source_document", "sources/documents.json", "application/json", "Source documents", poster.sourceDocuments?.length ?? 0),
      buildArtifact("source_summaries", "project_bundle", "source_summary", "sources/summaries.json", "application/json", "Source summaries", poster.sourceSummaries?.length ?? 0),
      buildArtifact("evidence", "project_bundle", "evidence", "evidence/evidence.json", "application/json", "Evidence items", poster.evidence?.length ?? 0),
      buildArtifact("claim_map", "project_bundle", "claim_map", "evidence/claim-map.json", "application/json", "Claim map", poster.claimMap?.entries.length ?? 0),
      buildArtifact("assets", "project_bundle", "asset", "assets/manifest.json", "application/json", "Asset manifest", countAssets(poster)),
      buildArtifact("traces", "project_bundle", "trace_log", "traces/trace.json", "application/json", "Trace log", poster.traces?.length ?? 0),
      buildArtifact("qa", "project_bundle", "qa_report", "qa/qa-results.json", "application/json", "QA report", poster.qaResults?.length ?? 0),
      buildArtifact("references", "project_bundle", "reference", "references/references.json", "application/json", "References", poster.references?.length ?? 0),
      buildArtifact("pptx", "pptx", "export", "exports/poster.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "Editable PPTX", undefined, "planned"),
      buildArtifact("pdf", "pdf", "export", "exports/poster.pdf", "application/pdf", "Print PDF", undefined, "planned"),
      buildArtifact("png", "png", "export", "exports/poster-preview.png", "image/png", "Preview PNG", undefined, "planned"),
    ],
  };
}

export function downloadProjectBundleManifest(poster: PosterProject) {
  downloadJson(`${poster.id || "poster"}-bundle-manifest.json`, buildProjectBundleManifest(poster));
}

function countAssets(poster: PosterProject): number {
  return (poster.assets?.length ?? 0) + poster.visuals.filter((visual) => visual.asset).length;
}

function buildArtifact(
  id: string,
  target: ExportArtifact["target"],
  kind: ExportArtifact["kind"],
  path: string,
  mimeType: string,
  label: string,
  count?: number,
  status: ExportArtifact["status"] = "ready",
): ExportArtifact {
  return {
    id,
    target,
    kind,
    path,
    mimeType,
    status,
    label,
    count,
  };
}

function downloadJson(filename: string, value: unknown) {
  const json = JSON.stringify(value, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
