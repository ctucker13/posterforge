import type { PosterProject } from "../domain/poster";
import { buildHtmlPreviewArtifact } from "./htmlPreview";
import type { ExportArtifact, ExportManifest, ExportTarget } from "./model";
export { buildPosterPptx, buildPptxPosterPlan, downloadPosterPptx } from "./pptx";
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
    id: "pdf",
    label: "Export A0 PDF",
    status: "available",
    description: "Primary print-ready A0 PDF rendered from the canonical HTML/CSS poster canvas.",
    output: "poster.pdf",
    requirements: ["Playwright", "A0 page size", "HTML/CSS poster canvas", "clipping QA report"],
  },
  {
    id: "screen_pdf",
    label: "Export virtual session PDF",
    status: "available",
    description:
      "Full A0 poster composition scaled to fit a 1920x1080 screen. Aspect ratio preserved, letterboxed. Open fullscreen in any PDF viewer for virtual poster sessions.",
    output: "poster-screen.pdf",
    requirements: ["Playwright", "npm run export:screen -- --poster spec/example-poster.json"],
  },
  {
    id: "html_project",
    label: "Export editable HTML project",
    status: "planned",
    description: "Future browser-native editable poster package that keeps PosterProject JSON and HTML/CSS assets together.",
    output: "poster-html-project.zip",
    requirements: ["PosterProject JSON", "HTML/CSS poster canvas", "asset manifest", "editor state"],
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
    id: "pptx",
    label: "Export PPTX compatibility snapshot",
    status: "available",
    description: "Legacy/compatibility PowerPoint snapshot. HTML/PDF is the primary polished output path.",
    output: "poster-compatibility.pptx",
    requirements: ["PptxGenJS", "compatibility export", "expect lower fidelity than HTML/PDF"],
  },
  {
    id: "project_bundle",
    label: "Export project bundle ZIP",
    status: "available",
    description: "ZIP containing poster JSON, sources, evidence, claims, traces, QA results, and references.",
    output: "posterforge-bundle.zip",
    requirements: ["valid PosterProject state", "jszip"],
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
      buildArtifact("pdf", "pdf", "export", "exports/poster.pdf", "application/pdf", "A0 PDF"),
      buildArtifact("html_project", "html_project", "export", "exports/poster-html-project.zip", "application/zip", "Editable HTML project", undefined, "planned"),
      buildArtifact("png", "png", "export", "exports/poster-preview.png", "image/png", "Preview PNG", undefined, "planned"),
      buildArtifact("pptx", "pptx", "export", "exports/poster-compatibility.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "PPTX compatibility snapshot"),
    ],
  };
}

export function downloadProjectBundleManifest(poster: PosterProject) {
  downloadJson(`${poster.id || "poster"}-bundle-manifest.json`, buildProjectBundleManifest(poster));
}

export async function downloadPosterZipBundle(poster: PosterProject) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  zip.file("poster.json", JSON.stringify(poster, null, 2));
  zip.file("bundle-manifest.json", JSON.stringify(buildProjectBundleManifest(poster), null, 2));

  if (poster.sourceDocuments?.length) zip.file("sources/documents.json", JSON.stringify(poster.sourceDocuments, null, 2));
  if (poster.sourceSummaries?.length) zip.file("sources/summaries.json", JSON.stringify(poster.sourceSummaries, null, 2));
  if (poster.evidence?.length) zip.file("evidence/evidence.json", JSON.stringify(poster.evidence, null, 2));
  if (poster.claimMap) zip.file("evidence/claim-map.json", JSON.stringify(poster.claimMap, null, 2));
  if (poster.references?.length) zip.file("references/references.json", JSON.stringify(poster.references, null, 2));
  if (poster.traces?.length) zip.file("traces/trace.json", JSON.stringify(poster.traces, null, 2));
  if (poster.qaResults?.length) zip.file("qa/qa-results.json", JSON.stringify(poster.qaResults, null, 2));

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${poster.id || "poster"}-bundle.zip`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
