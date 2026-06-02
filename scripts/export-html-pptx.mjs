#!/usr/bin/env node
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import pptxgen from "pptxgenjs";

const args = parseArgs(process.argv.slice(2));
const posterPath = String(args.poster ?? "spec/example-poster.json");
const outDir = String(args["out-dir"] ?? "exports");
const baseName = String(args.name ?? path.basename(posterPath, path.extname(posterPath)));
const poster = JSON.parse(await readFile(posterPath, "utf8"));
const css = await readFile("src/styles/app.css", "utf8");
const a0 = getA0Canvas(poster.format?.orientation ?? "landscape");

await mkdir(outDir, { recursive: true });

const htmlPath = path.join(outDir, `${baseName}.html`);
const pngPath = path.join(outDir, `${baseName}.png`);
const pptxPath = path.join(outDir, `${baseName}.html-render.pptx`);
const measurementPath = path.join(outDir, `${baseName}.measurements.json`);

const html = renderHtmlDocument(poster, css);
await writeFile(htmlPath, html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: a0.pixelWidth, height: a0.pixelHeight }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.resolve(htmlPath)).href, { waitUntil: "networkidle" });
await page.locator(".poster").waitFor();
await page.evaluate(() => {
  const canvas = document.querySelector(".posterforge-a0-canvas");
  const posterElement = document.querySelector(".poster");
  if (!(canvas instanceof HTMLElement) || !(posterElement instanceof HTMLElement)) {
    return;
  }

  posterElement.style.transform = "none";
  posterElement.style.left = "0px";
  posterElement.style.top = "0px";

  const natural = posterElement.getBoundingClientRect();
  const scale = Math.min(canvas.clientWidth / natural.width, canvas.clientHeight / natural.height);
  const fittedWidth = natural.width * scale;
  const fittedHeight = natural.height * scale;

  posterElement.style.transform = `scale(${scale})`;
  posterElement.style.left = `${(canvas.clientWidth - fittedWidth) / 2}px`;
  posterElement.style.top = `${(canvas.clientHeight - fittedHeight) / 2}px`;
  canvas.dataset.posterScale = String(scale);
});

const measurements = await page.locator(".posterforge-a0-canvas").evaluate((canvasElement) => {
  const posterElement = canvasElement.querySelector(".poster");
  if (!(posterElement instanceof HTMLElement)) {
    throw new Error("Could not find rendered poster inside A0 canvas.");
  }

  const canvasRect = canvasElement.getBoundingClientRect();
  const posterRect = posterElement.getBoundingClientRect();
  const items = [...posterElement.querySelectorAll("[data-poster-id], [data-visual-id], [data-block-id]")].map((element) => {
    const rect = element.getBoundingClientRect();
    return {
      id: element.getAttribute("data-poster-id") ?? element.getAttribute("data-visual-id") ?? element.getAttribute("data-block-id"),
      kind: element.getAttribute("data-poster-kind") ?? element.getAttribute("data-visual-type") ?? element.tagName.toLowerCase(),
      x: rect.left - canvasRect.left,
      y: rect.top - canvasRect.top,
      width: rect.width,
      height: rect.height,
    };
  });

  return {
    width: canvasRect.width,
    height: canvasRect.height,
    orientation: canvasElement.getAttribute("data-orientation"),
    aspectRatio: canvasRect.width / canvasRect.height,
    posterScale: Number(canvasElement.dataset.posterScale ?? 1),
    fittedPoster: {
      x: posterRect.left - canvasRect.left,
      y: posterRect.top - canvasRect.top,
      width: posterRect.width,
      height: posterRect.height,
    },
    items,
  };
});

await page.locator(".posterforge-a0-canvas").screenshot({ path: pngPath, animations: "disabled" });
await browser.close();

await writeFile(measurementPath, `${JSON.stringify({ posterId: poster.id, htmlPath, pngPath, pptxPath, a0, ...measurements }, null, 2)}\n`);

const slideWidth = a0.slideWidth;
const slideHeight = a0.slideHeight;
const pptx = new pptxgen();
pptx.defineLayout({ name: "POSTERFORGE_HTML", width: slideWidth, height: slideHeight });
pptx.layout = "POSTERFORGE_HTML";
pptx.author = "PosterForge";
pptx.subject = `High-fidelity HTML poster render, A0 ${a0.orientation}`;
pptx.title = poster.title;
const slide = pptx.addSlide();
slide.background = { color: "FFFFFF" };
slide.addImage({ path: pngPath, x: 0, y: 0, w: slideWidth, h: slideHeight });
slide.addNotes(`PosterForge high-fidelity HTML render export.\nPoster ID: ${poster.id}\nFormat: A0 ${a0.orientation} (${a0.mmWidth}mm x ${a0.mmHeight}mm)\nSource JSON: ${posterPath}\nMeasurements: ${measurementPath}`);
await pptx.writeFile({ fileName: pptxPath });

console.log(`HTML render: ${htmlPath}`);
console.log(`PNG capture: ${pngPath}`);
console.log(`PPTX export: ${pptxPath}`);
console.log(`Measurements: ${measurementPath}`);
console.log(`A0 ${a0.orientation}: ${a0.mmWidth}mm x ${a0.mmHeight}mm, slide ${slideWidth.toFixed(3)}in x ${slideHeight.toFixed(3)}in`);

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) {
      continue;
    }
    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function getA0Canvas(orientation) {
  const isPortrait = orientation === "portrait";
  const mmWidth = isPortrait ? 841 : 1189;
  const mmHeight = isPortrait ? 1189 : 841;
  const pixelWidth = isPortrait ? 1131 : 1600;
  const pixelHeight = Math.round((pixelWidth * mmHeight) / mmWidth);
  const slideWidth = mmWidth / 25.4;
  const slideHeight = mmHeight / 25.4;

  return {
    orientation: isPortrait ? "portrait" : "landscape",
    mmWidth,
    mmHeight,
    pixelWidth,
    pixelHeight,
    designWidth: isPortrait ? 1500 : 2400,
    slideWidth,
    slideHeight,
    aspectRatio: mmWidth / mmHeight,
  };
}

function renderHtmlDocument(project, appCss) {
  const palette = resolvePalette(project.theme, project.palette);
  const layout = resolveLayoutTemplate(project.layout);
  const visuals = new Map((project.visuals ?? []).map((visual) => [visual.id, visual]));
  const sources = new Map((project.sources ?? []).map((source) => [source.id, source]));

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(project.title)}</title>
    <style>
${appCss}
body { display: grid; place-items: center; min-height: 100vh; background: #edf1f5; }
.posterforge-static-export { width: ${a0.pixelWidth}px; height: ${a0.pixelHeight}px; padding: 0; }
.posterforge-a0-canvas {
  position: relative;
  overflow: hidden;
  width: ${a0.pixelWidth}px;
  height: ${a0.pixelHeight}px;
  background: color-mix(in srgb, ${palette.colors.primary}, white 92%);
}
.posterforge-static-export .poster {
  position: absolute;
  overflow: visible;
  flex: none;
  width: ${a0.designWidth}px;
  transform-origin: top left;
}
svg.export-icon { width: 18px; height: 18px; }
    </style>
  </head>
  <body>
    <main class="posterforge-static-export">
      <div class="posterforge-a0-canvas" data-orientation="${escapeAttribute(project.format?.orientation ?? "landscape")}">
      <article
        class="poster poster-${escapeAttribute(project.theme)} poster-layout-${escapeAttribute(layout.cssClass)}"
        style="--theme-primary: ${escapeAttribute(palette.colors.primary)}; --theme-accent: ${escapeAttribute(palette.colors.accent)}; --theme-bg: ${escapeAttribute(palette.colors.background)}; --theme-panel: ${escapeAttribute(palette.colors.panel)}; --theme-ink: ${escapeAttribute(palette.colors.ink)};"
        data-poster-id="${escapeAttribute(project.id)}"
        data-poster-kind="poster"
      >
        <header class="poster-hero" data-poster-id="hero" data-poster-kind="hero">
          <div>
            <p class="poster-kicker">${escapeHtml(layout.name)} · ${escapeHtml(project.audience ?? "")}</p>
            <h2>${escapeHtml(project.title)}</h2>
            <p>${escapeHtml(project.subtitle ?? "")}</p>
          </div>
          <div class="hero-asset" aria-label="Generated image asset placeholder">
            ${imageIcon()}
            <span>GPT Image asset slot</span>
          </div>
        </header>

        <div class="poster-grid">
          ${(project.sections ?? []).map((section) => renderSection(section, layout, visuals, project, sources)).join("\n")}
          ${renderClaimCard(project, sources)}
          ${renderSourceCard(project)}
        </div>
      </article>
      </div>
    </main>
  </body>
</html>`;
}

function renderSection(section, layout, visuals, project, sources) {
  const featured = isFeaturedSection(layout, section) ? "featured-section" : "";
  return `<section class="poster-card section-${escapeAttribute(section.type)} section-${escapeAttribute(section.id)} ${featured}" data-poster-id="${escapeAttribute(section.id)}" data-poster-kind="section">
  <h3>${escapeHtml(section.title)}</h3>
  ${(section.blocks ?? []).map((block, index) => renderBlock(block, index, visuals, project, sources)).join("\n")}
</section>`;
}

function renderBlock(block, index, visuals, project, sources) {
  if (block.type === "text") {
    const claims = (block.claim_ids ?? []).map((claimId) => (project.claims ?? []).find((claim) => claim.id === claimId)).filter(Boolean);
    return `<div class="poster-text-block" data-block-id="text-${index}" data-poster-kind="text">
  <p>${escapeHtml(block.text)}</p>
  ${
    claims.length
      ? `<div class="text-claim-badges" aria-label="Text claim sources">${claims
          .map(
            (claim) =>
              `<span class="text-claim-badge" title="${escapeAttribute(claim.text)}">${linkIcon()}${escapeHtml(
                claim.source_ids.map((sourceId) => sources.get(sourceId)?.title ?? sourceId).join(", ") || claim.id,
              )}</span>`,
          )
          .join("")}</div>`
      : ""
  }
</div>`;
  }

  const visual = visuals.get(block.visual_id);
  return visual ? renderVisual(visual) : `<p>Missing visual: ${escapeHtml(block.visual_id)}</p>`;
}

function renderVisual(visual) {
  if (visual.type === "confusion_matrix") {
    const data = visual.data ?? {};
    const labels = Array.isArray(data.labels) ? data.labels : ["Negative", "Positive"];
    const matrix = Array.isArray(data.matrix) ? data.matrix : [[0, 0], [0, 0]];
    const total = matrix.flat().reduce((sum, value) => sum + Number(value || 0), 0);
    const safeTotal = Math.max(total, 1);
    const cells = [
      [`True ${labels[0]}`, matrix[0]?.[0] ?? 0, false],
      [`False ${labels[0]}`, matrix[0]?.[1] ?? 0, true],
      [`False ${labels[1]}`, matrix[1]?.[0] ?? 0, true],
      [`True ${labels[1]}`, matrix[1]?.[1] ?? 0, false],
    ];
    const tn = Number(matrix[0]?.[0] ?? 0);
    const fp = Number(matrix[0]?.[1] ?? 0);
    const fn = Number(matrix[1]?.[0] ?? 0);
    const tp = Number(matrix[1]?.[1] ?? 0);
    return `<div class="visual-box" data-visual-id="${escapeAttribute(visual.id)}" data-visual-type="${escapeAttribute(visual.type)}">
  ${visualHeader(visual.title, `${total.toLocaleString()} cases`)}
  <div class="matrix">${cells
    .map(
      ([label, value, error]) =>
        `<div class="matrix-cell ${error ? "error" : ""}"><span>${escapeHtml(label)}</span><strong>${Number(value).toLocaleString()}</strong><em>${formatPercent(Number(value) / safeTotal)}</em></div>`,
    )
    .join("")}</div>
  <dl class="matrix-summary">
    <div><dt>Accuracy</dt><dd>${formatPercent((tn + tp) / safeTotal)}</dd></div>
    <div><dt>Precision</dt><dd>${formatPercent(tp + fp > 0 ? tp / (tp + fp) : null)}</dd></div>
    <div><dt>Recall</dt><dd>${formatPercent(tp + fn > 0 ? tp / (tp + fn) : null)}</dd></div>
  </dl>
</div>`;
  }

  if (visual.type === "table") {
    const columns = Array.isArray(visual.data?.columns) ? visual.data.columns : [];
    const rows = Array.isArray(visual.data?.rows) ? visual.data.rows : [];
    return `<div class="visual-box" data-visual-id="${escapeAttribute(visual.id)}" data-visual-type="${escapeAttribute(visual.type)}">
  ${visualHeader(visual.title, `${rows.length} row${rows.length === 1 ? "" : "s"}`)}
  <div class="table-wrap"><table class="data-table"><thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead>
  <tbody>${rows
    .map(
      (row) =>
        `<tr>${columns
          .map((column, columnIndex) => `<td>${escapeHtml(formatTableCell(Array.isArray(row) ? row[columnIndex] : row[column]))}</td>`)
          .join("")}</tr>`,
    )
    .join("")}</tbody></table></div>
</div>`;
  }

  if (visual.type === "sankey") {
    const links = Array.isArray(visual.data?.links) ? visual.data.links : [];
    const total = links.reduce((sum, link) => sum + Number(link.value || 0), 0);
    const max = Math.max(...links.map((link) => Number(link.value || 0)), 1);
    return `<div class="visual-box" data-visual-id="${escapeAttribute(visual.id)}" data-visual-type="${escapeAttribute(visual.type)}">
  ${visualHeader(visual.title, `${links.length} flows`)}
  <div class="flow-list">${links
    .map((link) => {
      const width = Math.max(7, (Number(link.value || 0) / max) * 100);
      const share = formatPercent(Number(link.value || 0) / Math.max(total, 1));
      return `<div class="flow-row"><span>${escapeHtml(link.source)} to ${escapeHtml(link.target)}</span><div class="flow-track"><div class="flow-bar" style="width: ${width}%"></div></div><strong>${Number(link.value || 0).toLocaleString()}</strong><em>${share} of total</em></div>`;
    })
    .join("")}</div>
  ${links.length ? `<p class="flow-total">Total flow: ${total.toLocaleString()}</p>` : `<p class="visual-empty">No flow links supplied.</p>`}
</div>`;
  }

  if (visual.type === "timeline") {
    const events = Array.isArray(visual.data?.events) ? visual.data.events : [];
    return `<div class="visual-box" data-visual-id="${escapeAttribute(visual.id)}" data-visual-type="${escapeAttribute(visual.type)}">
  ${visualHeader(visual.title, `${events.length} milestone${events.length === 1 ? "" : "s"}`)}
  <ol class="timeline-list">${events
    .map(
      (event, index) =>
        `<li><span class="timeline-marker">${index + 1}</span><time>${escapeHtml(event.date)}</time><strong>${escapeHtml(event.label)}</strong>${event.detail ? `<p>${escapeHtml(event.detail)}</p>` : ""}</li>`,
    )
    .join("")}</ol>
</div>`;
  }

  if (visual.type === "gantt") {
    const tasks = Array.isArray(visual.data?.tasks) ? visual.data.tasks : [];
    const segments = buildGanttSegments(tasks);
    return `<div class="visual-box" data-visual-id="${escapeAttribute(visual.id)}" data-visual-type="${escapeAttribute(visual.type)}">
  ${visualHeader(visual.title, `${tasks.length} task${tasks.length === 1 ? "" : "s"}`)}
  <div class="gantt-list">${segments
    .map(
      (task) =>
        `<div class="gantt-row"><div><strong>${escapeHtml(task.label)}</strong><span>${escapeHtml(task.start)} to ${escapeHtml(task.end)}</span>${task.status ? `<em>${escapeHtml(task.status)}</em>` : ""}</div><div class="gantt-track"><div class="gantt-bar" style="margin-left: ${task.offsetPercent}%; width: ${task.widthPercent}%"></div></div></div>`,
    )
    .join("")}</div>
</div>`;
  }

  if (visual.type === "mermaid_flow") {
    return sourceVisual(visual, visual.data?.source ?? "", "diagram-source");
  }

  if (visual.type === "math") {
    return `<div class="visual-box" data-visual-id="${escapeAttribute(visual.id)}" data-visual-type="${escapeAttribute(visual.type)}"><h3>${escapeHtml(visual.title)}</h3><div class="math-placeholder"><span>LaTeX source</span><code>${escapeHtml(visual.data?.source ?? visual.data?.latex ?? "")}</code></div></div>`;
  }

  if (visual.type === "code_block") {
    return sourceVisual(visual, visual.data?.code ?? "", "code-placeholder");
  }

  if (visual.type === "metric_card") {
    return `<div class="visual-box" data-visual-id="${escapeAttribute(visual.id)}" data-visual-type="${escapeAttribute(visual.type)}"><h3>${escapeHtml(visual.title)}</h3><div class="metric-card"><span>${escapeHtml(visual.data?.label ?? "")}</span><strong>${escapeHtml(String(visual.data?.value ?? ""))}</strong>${visual.data?.note ? `<p>${escapeHtml(visual.data.note)}</p>` : ""}</div></div>`;
  }

  if (["ai_image", "generated_background", "generated_comic_panel"].includes(visual.type)) {
    const imageUrl = visual.asset?.url ? resolveAssetUrl(visual.asset.url) : "";
    return `<div class="visual-box generated-asset" data-visual-id="${escapeAttribute(visual.id)}" data-visual-type="${escapeAttribute(visual.type)}"><h3>${escapeHtml(visual.title)}</h3><div class="generated-asset-frame ${imageUrl ? "has-image" : ""}">${
      imageUrl ? `<img class="generated-asset-image" src="${escapeAttribute(imageUrl)}" alt="${escapeAttribute(visual.asset?.title ?? visual.title)}" />` : `<span>${escapeHtml(visual.type.replace(/_/g, " "))}</span><p>${escapeHtml(visual.asset?.prompt ?? visual.data?.prompt ?? "Generated visual asset placeholder.")}</p>`
    }</div></div>`;
  }

  return `<div class="visual-box" data-visual-id="${escapeAttribute(visual.id)}" data-visual-type="${escapeAttribute(visual.type)}"><h3>${escapeHtml(visual.title)}</h3><p>${escapeHtml(visual.type)} renderer pending.</p></div>`;
}

function visualHeader(title, meta) {
  return `<div class="visual-header"><h3>${escapeHtml(title)}</h3>${meta ? `<span>${escapeHtml(meta)}</span>` : ""}</div>`;
}

function sourceVisual(visual, source, className) {
  return `<div class="visual-box" data-visual-id="${escapeAttribute(visual.id)}" data-visual-type="${escapeAttribute(visual.type)}"><h3>${escapeHtml(visual.title)}</h3><pre class="${className}"><code>${escapeHtml(source)}</code></pre></div>`;
}

function renderClaimCard(project, sources) {
  return `<section class="poster-card claim-card" data-poster-id="claim_map" data-poster-kind="claim_map"><h3>Claim map</h3><div class="claim-list">${(project.claims ?? [])
    .map(
      (claim) =>
        `<div><p>${escapeHtml(claim.text)}</p><span>${linkIcon()}${escapeHtml(claim.source_ids.map((sourceId) => sources.get(sourceId)?.title ?? sourceId).join(", ") || "No source")}</span></div>`,
    )
    .join("")}</div></section>`;
}

function renderSourceCard(project) {
  return `<section class="poster-card source-card" data-poster-id="source_bundle" data-poster-kind="source_bundle"><h3>Source bundle</h3><div class="source-list">${(project.sources ?? [])
    .map((source) => `<div>${fileIcon()}<span>${escapeHtml(source.title)}</span></div>`)
    .join("")}</div></section>`;
}

function resolvePalette(themeId, paletteOverride) {
  const palettes = {
    "natwest-group": { colors: { primary: "#3C1053", accent: "#E90000", background: "#FFFFFF", panel: "#F7F3F8", ink: "#1E1028" } },
    "clean-blue": { colors: { primary: "#17324D", accent: "#2176AE", background: "#F3F7FA", panel: "#FFFFFF", ink: "#122232" } },
    "comic-ink": { colors: { primary: "#171717", accent: "#D1272F", background: "#FFF7D1", panel: "#FFFFFF", ink: "#171717" } },
    "retro-lab": { colors: { primary: "#202045", accent: "#FF3D81", background: "#EEF0FF", panel: "#FFFFFF", ink: "#17172F" } },
  };
  const themes = {
    "natwest-group": { palette: "natwest-group" },
    "comic-strip": { palette: "comic-ink" },
    "clean-academic": { palette: "clean-blue" },
    "retro-time-lab": { palette: "retro-lab" },
  };
  const paletteId = paletteOverride ?? themes[themeId]?.palette ?? "clean-blue";
  return palettes[paletteId] ?? palettes["clean-blue"];
}

function resolveLayoutTemplate(layoutId) {
  const layouts = {
    "three-column-academic": { name: "Three-column academic", cssClass: "three-column-academic", featuredSectionTypes: ["hero", "results"] },
    "results-first": { name: "Results-first", cssClass: "results-first", featuredSectionTypes: ["results", "key_findings"] },
    "timeline-process": { name: "Timeline/process", cssClass: "timeline-process", featuredSectionTypes: ["timeline", "methods"] },
    "dashboard-poster": { name: "Dashboard poster", cssClass: "dashboard-poster", featuredSectionTypes: ["results", "key_findings"] },
    "comic-strip-narrative": { name: "Comic-strip narrative", cssClass: "comic-strip-narrative", featuredSectionTypes: ["hero", "discussion"] },
    "case-study-poster": { name: "Case-study poster", cssClass: "case-study-poster", featuredSectionTypes: ["background", "methods", "results"] },
  };
  return layouts[layoutId] ?? layouts["three-column-academic"];
}

function isFeaturedSection(layout, section) {
  return layout.featuredSectionTypes.includes(section.type);
}

function buildGanttSegments(tasks) {
  const dates = tasks.flatMap((task) => [Date.parse(task.start), Date.parse(task.end)]).filter(Number.isFinite);
  const min = dates.length ? Math.min(...dates) : 0;
  const max = dates.length ? Math.max(...dates) : min + 1;
  const span = Math.max(max - min, 1);
  return tasks.map((task) => {
    const start = Date.parse(task.start);
    const end = Date.parse(task.end);
    const offsetPercent = Number.isFinite(start) ? clamp(((start - min) / span) * 100, 0, 100) : 0;
    const rawWidth = Number.isFinite(start) && Number.isFinite(end) ? ((end - start) / span) * 100 : 30;
    return { ...task, offsetPercent, widthPercent: clamp(Math.max(rawWidth, 8), 1, 100 - offsetPercent) };
  });
}

function resolveAssetUrl(url) {
  if (!url.startsWith("/")) {
    return url;
  }
  return pathToFileURL(path.resolve("public", url.slice(1))).href;
}

function formatPercent(value) {
  return value === null || Number.isNaN(value) ? "n/a" : `${(value * 100).toFixed(1)}%`;
}

function formatTableCell(value) {
  if (typeof value === "number") {
    return value.toLocaleString();
  }
  return String(value ?? "");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function imageIcon() {
  return `<svg class="export-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>`;
}

function linkIcon() {
  return `<svg class="export-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
}

function fileIcon() {
  return `<svg class="export-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="m9 15 2 2 4-4"/></svg>`;
}
