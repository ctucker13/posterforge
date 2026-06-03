import { renderToStaticMarkup } from "react-dom/server";
import type { PosterProject } from "../domain/poster";
import { getA0PreviewFrame, PosterCanvas } from "../components/PosterCanvas";

export interface RenderPosterHtmlOptions {
  css: string;
  title?: string;
  mode?: "preview" | "edit" | "export";
}

export function renderPosterHtml(poster: PosterProject, options: RenderPosterHtmlOptions) {
  const frame = getA0PreviewFrame(poster.format.orientation);
  const orientation = frame.orientation;
  const body = renderToStaticMarkup(<PosterCanvas poster={poster} mode={options.mode ?? "export"} />);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(options.title ?? poster.title)}</title>
    <style>
${options.css}
@page {
  size: A0 ${orientation};
  margin: 0;
}

html,
body {
  width: ${frame.mmWidth}mm;
  height: ${frame.mmHeight}mm;
  margin: 0;
  background: #ffffff;
}

body {
  overflow: hidden;
}

.a0-preview-canvas {
  width: ${frame.mmWidth}mm !important;
  height: ${frame.mmHeight}mm !important;
  border: 0;
  box-shadow: none;
}
    </style>
  </head>
  <body>
    ${body}
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
