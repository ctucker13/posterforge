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
    status: "planned",
    description: "Complete bundle containing the spec, sources, assets, traces, QA, and exports.",
    output: "posterforge-project.zip",
    requirements: ["bundle manifest", "asset file storage", "generated export artifacts"],
  },
];

export function downloadPosterJson(poster: PosterProject) {
  const json = JSON.stringify(poster, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${poster.id || "poster"}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
