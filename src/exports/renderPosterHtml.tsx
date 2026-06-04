import { renderToStaticMarkup } from "react-dom/server";
import type { PosterProject } from "../domain/poster";
import { getA0PreviewFrame, PosterCanvas } from "../components/PosterCanvas";
import { resolvePalette } from "../themes";

export interface RenderPosterHtmlOptions {
  css: string;
  title?: string;
  mode?: "preview" | "edit" | "export";
  target?: "print" | "screen";
}

export function renderPosterHtml(poster: PosterProject, options: RenderPosterHtmlOptions) {
  const frame = getA0PreviewFrame(poster.format.orientation);
  const orientation = frame.orientation;
  const target = options.target ?? "print";
  const palette = resolvePalette(poster.theme, poster.palette);
  const posterBgColour = palette.colors.background ?? "#ffffff";
  const screenWidth = 1920;
  const screenHeight = 1080;
  const screenFitZoom = Math.min(screenWidth / frame.width, screenHeight / frame.height);
  const body = renderToStaticMarkup(<PosterCanvas poster={poster} mode={options.mode ?? "export"} />);
  const pageAndBodyCss =
    target === "screen"
      ? `
@page { size: ${screenWidth}px ${screenHeight}px; margin: 0; }
html,
body {
  width: ${screenWidth}px;
  height: ${screenHeight}px;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: ${posterBgColour};
}
.screen-fit-frame {
  width: ${screenWidth}px;
  height: ${screenHeight}px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${posterBgColour};
}
.screen-fit-frame .a0-preview-canvas {
  transform: scale(${screenFitZoom.toFixed(4)});
  transform-origin: center center;
  flex-shrink: 0;
  border: 0;
  box-shadow: none;
}
`
      : `
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
`;
  const bodyHtml = target === "screen" ? `<div class="screen-fit-frame">${body}</div>` : body;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(options.title ?? poster.title)}</title>
    <style>
${options.css}
${pageAndBodyCss}
    </style>
  </head>
  <body>
    ${bodyHtml}
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
