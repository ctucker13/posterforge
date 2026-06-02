import type { PosterProject } from "../domain/poster";

export type ExportTarget = "poster_json" | "pptx" | "pdf" | "png" | "project_bundle";

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

export interface ProjectBundleManifest {
  id: string;
  posterId: string;
  createdAt: string;
  schemaVersion: string;
  entries: Array<{
    id: string;
    kind: "poster_spec" | "source_document" | "source_summary" | "evidence" | "claim_map" | "asset" | "trace_log" | "qa_report" | "reference" | "export";
    path: string;
    count?: number;
    status: "available" | "planned";
  }>;
}

export function buildProjectBundleManifest(poster: PosterProject, createdAt = new Date().toISOString()): ProjectBundleManifest {
  return {
    id: `${poster.id || "poster"}_bundle_manifest`,
    posterId: poster.id,
    createdAt,
    schemaVersion: "posterforge.bundle.v0",
    entries: [
      { id: "poster_json", kind: "poster_spec", path: "poster.json", status: "available" },
      {
        id: "source_documents",
        kind: "source_document",
        path: "sources/documents.json",
        count: poster.sourceDocuments?.length ?? 0,
        status: "available",
      },
      {
        id: "source_summaries",
        kind: "source_summary",
        path: "sources/summaries.json",
        count: poster.sourceSummaries?.length ?? 0,
        status: "available",
      },
      { id: "evidence", kind: "evidence", path: "evidence/evidence.json", count: poster.evidence?.length ?? 0, status: "available" },
      { id: "claim_map", kind: "claim_map", path: "evidence/claim-map.json", count: poster.claimMap?.entries.length ?? 0, status: "available" },
      { id: "assets", kind: "asset", path: "assets/manifest.json", count: countAssets(poster), status: "available" },
      { id: "traces", kind: "trace_log", path: "traces/trace.json", count: poster.traces?.length ?? 0, status: "available" },
      { id: "qa", kind: "qa_report", path: "qa/qa-results.json", count: poster.qaResults?.length ?? 0, status: "available" },
      { id: "references", kind: "reference", path: "references/references.json", count: poster.references?.length ?? 0, status: "available" },
      { id: "pptx", kind: "export", path: "exports/poster.pptx", status: "planned" },
      { id: "pdf", kind: "export", path: "exports/poster.pdf", status: "planned" },
      { id: "png", kind: "export", path: "exports/poster-preview.png", status: "planned" },
    ],
  };
}

export function downloadProjectBundleManifest(poster: PosterProject) {
  downloadJson(`${poster.id || "poster"}-bundle-manifest.json`, buildProjectBundleManifest(poster));
}

function countAssets(poster: PosterProject): number {
  return (poster.assets?.length ?? 0) + poster.visuals.filter((visual) => visual.asset).length;
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
