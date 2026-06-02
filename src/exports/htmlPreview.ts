import type { PosterProject } from "../domain/poster";
import type { ExportArtifact } from "./model";

export interface HtmlPreviewDescriptor {
  posterId: string;
  title: string;
  theme: string;
  palette?: string;
  layout: string;
  format: PosterProject["format"];
  sections: Array<{
    id: string;
    title: string;
    type: string;
    blockCount: number;
  }>;
  visualIds: string[];
}

export function buildHtmlPreviewDescriptor(poster: PosterProject): HtmlPreviewDescriptor {
  return {
    posterId: poster.id,
    title: poster.title,
    theme: poster.theme,
    palette: poster.palette,
    layout: poster.layout,
    format: poster.format,
    sections: poster.sections.map((section) => ({
      id: section.id,
      title: section.title,
      type: section.type,
      blockCount: section.blocks.length,
    })),
    visualIds: poster.visuals.map((visual) => visual.id),
  };
}

export function buildHtmlPreviewArtifact(poster: PosterProject, createdAt = new Date().toISOString()): ExportArtifact {
  return {
    id: "html_preview_descriptor",
    target: "html_preview",
    kind: "html_preview",
    path: "preview/html-preview.json",
    mimeType: "application/json",
    status: "ready",
    label: "HTML preview descriptor",
    createdAt,
    metadata: {
      descriptor: buildHtmlPreviewDescriptor(poster),
    },
  };
}
